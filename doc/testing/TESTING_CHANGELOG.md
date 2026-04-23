# Testing Changelog Consolidation

This repo is a test environment for the changelog consolidation feature before deploying to KOS.Datascience.

## What This Tests

- **Changelog consolidation** — Extracts changelog entries between releases and appends to GitHub Release notes
- **Two-step status markers** — "Pending Deployment" → "Deployed" transition
- **Release flow** — Semantic release → Dev → Stage → Prod deployment chain
- **Hotfix workflow** — Prerelease creation and version handling

## Quick Test Procedure

### 1. Create Test Releases

Make a few commits with conventional commit messages:

```bash
git checkout main
git pull

# Create feature releases
git commit --allow-empty -m "feat: add feature A"
git push

git commit --allow-empty -m "feat: add feature B"  
git push

git commit --allow-empty -m "fix: resolve bug C"
git push
```

This will create v1.0.0, v1.1.0, v1.2.0 (or similar) automatically via semantic-release.

### 2. Manually Deploy to Stage

1. Go to Actions → "Deploy to Staging"
2. Click "Run workflow"
3. Enter the **latest** release tag (e.g., `v1.2.0`)
4. Click "Run workflow"

**Expected behavior**:
- `consolidate-changelog` job runs first
- Finds last stage deployment (e.g., `v1.0.0`)
- Updates release notes for `v1.2.0` with:
  ```markdown
  ## 📦 Pending Deployment to stage | v1.0.0 → v1.2.0
  
  [Changelog from v1.1.0 and v1.2.0 combined]
  ```
- `approval` job shows link to review release notes
- `deploy` job runs (just prints hello world, doesn't actually deploy)
- `mark-deployed` job updates release notes to:
  ```markdown
  ## 📦 Deployed to stage | v1.0.0 → v1.2.0 | 2026-04-22 14:35 UTC
  ```

### 3. Verify Release Notes

1. Go to Releases page
2. Click on the deployed release (e.g., `v1.2.0`)
3. Scroll down to see the consolidated changelog section
4. Verify it shows the correct version range and all intermediate changes

### 4. Test Production Deployment

Same process as stage, but:
- Use "Deploy to Production" workflow
- Should consolidate changes since last prod deployment
- After `mark-deployed`, the `promote-release` job marks it as "latest" (unless hotfix)

## What's Different from KOS.Datascience?

-  **No actual deployments** — `deploy-template.yml` just prints info, doesn't deploy to Databricks
- **Simplified structure** — No Databricks bundle validation or asset downloads
- **Same release logic** — Semantic-release, hotfix handling, and changelog consolidation work identically

## Edge Cases to Test

### First Deployment to Environment
```bash
# Deploy any release to stage for the first time
# Should show: "📦 Pending Deployment to stage | Initial Deployment"
```

### Skip Versions
```bash
# Deploy v1.0.0 to stage
# Create v1.1.0, v1.2.0, v1.3.0
# Deploy v1.3.0 to stage
# Should consolidate v1.1.0, v1.2.0, v1.3.0 all together
```

### Same Version Redeploy
```bash
# Deploy v1.2.0 to stage
# Deploy v1.2.0 to stage again
# Should show "No new changes since v1.2.0"
```

### Hotfix Release
```bash
git checkout -b hotfix/v1.2.1-critical-bug
git commit --allow-empty -m "fix: critical production issue"
git push -u origin hotfix/v1.2.1-critical-bug

# Manually trigger Release workflow from hotfix branch
# Should create v1.2.1-hotfix-from-v1-2-1.1 (or similar)
# Deploy to prod
# Should NOT promote to "latest" (stays as prerelease)
```

### Main Release After Hotfix (Divergent Lineages)
```bash
# 1. Deploy v1.2.0 to stage from main
# 2. Create and deploy v1.2.1 hotfix to stage
# 3. On main, create v1.3.0 (which doesn't know about v1.2.1)
git checkout main
git commit --allow-empty -m "feat: new feature on main"
git push

# 4. Deploy v1.3.0 to stage
# Expected behavior:
# - Detects v1.2.1 not in v1.3.0's CHANGELOG.md
# - Shows all changes in v1.3.0 lineage
# - Adds note: "Previous deployment (v1.2.1) was from different branch lineage"
```

### Hotfix to Hotfix (Same Lineage)
```bash
# 1. Deploy v1.2.1 hotfix to stage
# 2. Create another hotfix on same branch
git checkout hotfix/v1.2.1-critical-bug
git commit --allow-empty -m "fix: another critical issue"
git push

# 3. Deploy v1.2.2 to stage
# Expected behavior:
# - v1.2.2's CHANGELOG.md contains [1.2.1]
# - Shows precise diff between v1.2.1 and v1.2.2
# - No divergent lineage warning
```

## Debugging

### Check Last Deployment
```bash
gh api /repos/Ecolab-IT/daves-youtube-demo-action/actions/workflows/deploy-stage.yml/runs \
  --field status=completed \
  --field conclusion=success \
  --field per_page=5
```

### View Current Release Notes
```bash
gh release view v1.2.0 --json body -q .body
```

### Test CHANGELOG.md Parsing Locally
You can test the version extraction logic locally by running this command against your actual `CHANGELOG.md` file:

```bash
OLD_VERSION="v1.0.0"
NEW_VERSION="v1.2.0"

# This reads CHANGELOG.md and extracts everything between the two version headers
awk -v old="$OLD_VERSION" -v new="$NEW_VERSION" '
  BEGIN { in_range=0; found_new=0 }
  /^## \[/ {
    version = $0
    gsub(/^## \[/, "", version)
    gsub(/\].*$/, "", version)
    if (version == new) { found_new=1; in_range=1; print $0; next }
    if (version == old) { in_range=0; exit }
    if (in_range) { print $0; next }
  }
  { if (in_range) { print $0 } }
' CHANGELOG.md
```

### How Hotfix Consolidation Works

The changelog consolidation works **chronologically**, not semantically. This makes it robust for hotfixes.

**The source:** All version extraction happens on the **`CHANGELOG.md`** file at the root of the repository. This file is automatically generated and maintained by semantic-release every time a new release is created.

**Critical for hotfixes:** The workflow checks out the specific release tag (`ref: ${{ inputs.release_tag }}`), not the default branch. This is essential because:
- Hotfix branches have different CHANGELOG.md content than main
- semantic-release updates CHANGELOG.md on the hotfix branch when creating the hotfix release
- main branch won't have the hotfix version in its CHANGELOG.md until the hotfix is merged back
- Therefore, we must read CHANGELOG.md from the tag's commit, not from main

#### 1. Find Last Deployed Version (Chronological)
The workflow queries GitHub Actions API for the **last successful deployment** to that environment:
```bash
GET /repos/{repo}/actions/workflows/{deploy-stage.yml}/runs?status=completed&conclusion=success&per_page=1
```

This returns the most **recently deployed** version, regardless of semantic version ordering.

#### 2. Extract Changelog (Sequential Walk Through CHANGELOG.md)
The awk script walks through **`CHANGELOG.md`** file **from top to bottom** (newest to oldest, as created by semantic-release).

**What CHANGELOG.md looks like** (generated by semantic-release):
```markdown
## [3.27.0](https://github.com/owner/repo/compare/v3.26.2...v3.27.0) (2026-04-22)

### 🚀 Features
* test release fix 1

## [3.26.2](https://github.com/owner/repo/compare/v3.26.1...v3.26.2) (2026-04-22)

### 🐛 Bug Fixes
* normalize version comparison in changelog extraction

## [3.26.1](https://github.com/owner/repo/compare/v3.26.0...v3.26.1) (2026-04-22)

### 🐛 Bug Fixes
* mark and changelog naming

## [3.26.0](https://github.com/owner/repo/compare/v3.25.0...v3.26.0) (2026-04-22)

### 🚀 Features
* test release 3
```

**How the awk script works on this file:**
```awk
/^## \[/ {                          # Match lines starting with "## ["
  version = $0                      # Copy the full line
  gsub(/^## \[v?/, "", version)     # Strip "## [" or "## [v" prefix
  gsub(/\].*$/, "", version)        # Strip "]" and everything after
  
  if (version == new) {             # Found the NEW version
    in_range=1                      # Start capturing
    print $0
    next
  }
  
  if (version == old) {             # Found the OLD (last deployed) version
    in_range=0                      # Stop capturing
    exit                            # Exit immediately
  }
  
  if (in_range) {                   # We're between NEW and OLD
    print $0                        # Print the section header
  }
}
{ if (in_range) { print $0 } }      # Print all content while in range
```

**In the workflow:** This exact awk script runs in the "Extract changelog sections" step of [`.github/workflows/consolidate-changelog.yml`](../../.github/workflows/consolidate-changelog.yml):
```bash
# Line 118-152 in consolidate-changelog.yml
EXTRACTED=$(awk -v old="$OLD_VERSION_NORMALIZED" -v new="$NEW_VERSION_NORMALIZED" '
  ...awk script...
' CHANGELOG.md)   # ← Reading from CHANGELOG.md in the repository root
```

**The key:** It captures everything **between** when it finds `[NEW_VERSION]` and when it finds `[OLD_VERSION]`.

#### 3. Hotfix Scenarios

**Hotfix → Regular Release:**
```
Timeline:
1. Deploy v3.24.0 to prod
2. Deploy v3.24.1 (hotfix) to prod  ← Last deployed
3. Deploy v3.25.0 (regular) to prod ← New deployment

Workflow behavior:
- API query returns: v3.24.1 (last successful deployment)
- awk walks CHANGELOG.md from top:
  1. Finds ## [3.25.0] → starts capturing (in_range=1)
  2. Captures all v3.25.0 content
  3. Finds ## [3.24.1] → stops capturing (in_range=0)
- Result: Extracts only v3.25.0 changes
```

**Hotfix → Hotfix:**
```
Timeline:
1. Deploy v3.24.1 (hotfix) to prod  ← Last deployed
2. Deploy v3.24.2 (hotfix) to prod  ← New deployment

Workflow behavior:
- API query returns: v3.24.1
- awk extracts: ## [3.24.2] → ## [3.24.1]
- Result: Just v3.24.2 hotfix changes
```

**Regular → Hotfix (skipping unreleased versions):**
```
Timeline:
1. Deploy v3.24.0 to prod  ← Last deployed
2. Create v3.25.0 (exists but never deployed to prod)
3. Deploy v3.24.1 (hotfix) to prod  ← New deployment

CHANGELOG.md structure (newest first - this is the actual file):
┌─────────────────────────────────────────────────────────────┐
│ ## [3.25.0](...) (2026-04-20)                               │
│                                                              │
│ ### 🚀 Features                                             │
│ * new feature that's not deployed yet                       │
│                                                              │
│ ## [3.24.1](...) (2026-04-22)    ← NEW (hotfix)            │
│                                                              │
│ ### 🐛 Bug Fixes                                            │
│ * critical production fix                                    │
│                                                              │
│ ## [3.24.0](...) (2026-04-18)    ← OLD (last deployed)     │
│                                                              │
│ ### 🚀 Features                                             │
│ * original release                                           │
└─────────────────────────────────────────────────────────────┘

Workflow behavior:
- API query returns: v3.24.0 (last successful prod deployment)
- awk script command: awk -v old="3.24.0" -v new="3.24.1" '...' CHANGELOG.md
- awk walks file from top to bottom:
  1. Sees ## [3.25.0] → NOT the new version, skips (in_range=0)
  2. Finds ## [3.24.1] → matches NEW, starts capturing (in_range=1) ✅
  3. Captures "### 🐛 Bug Fixes" and "* critical production fix"
  4. Finds ## [3.24.0] → matches OLD, stops capturing (in_range=0) ✅
- Result: Extracts only v3.24.1, SKIPS unreleased v3.25.0
```

**Why this works:** The workflow doesn't care about semantic version ordering — it only cares about:
1. **What was last deployed** (from API query - chronological deployment history)
2. **Sequential position in CHANGELOG.md** (top-to-bottom walk through the file)

The awk script is literally reading the `CHANGELOG.md` file line by line, matching the `## [version]` headers, and extracting everything between the NEW version header and the OLD version header.

**Important limitation - Divergent branch lineages:**

When deploying a main-branch release after a hotfix was deployed, the OLD version won't exist in the NEW version's CHANGELOG.md:

```
Scenario:
1. Deploy v1.2.0 to prod (from main)
2. Deploy v1.2.1 to prod (hotfix) ← Last deployed
3. Deploy v1.3.0 to prod (from main) ← NEW deployment

v1.3.0's CHANGELOG.md (created before hotfix existed):
  ## [1.3.0] ← Has these
  ## [1.2.0] ← Has these
  ## [1.1.0] ← Has these
  (no [1.2.1] because v1.3.0 was created before the hotfix)

Result:
- awk looks for [1.2.1] → doesn't find it
- Extracts everything from [1.3.0] to end of file
- Shows all changes in v1.3.0 lineage (v1.3.0, v1.2.0, v1.1.0, etc.)
```

**This is acceptable because:**
- v1.3.0 doesn't "know about" v1.2.1 (different branch lineage)
- The release notes show "here's what's in v1.3.0"
- If the hotfix fix should persist, it must be backmerged to main separately
- The backmerge commit will appear in a future release's changelog

**Hotfix-to-hotfix deployments work correctly:**
- v1.2.1 → v1.2.2: Both on same branch lineage, both in same CHANGELOG.md ✅
- Shows precise diff between the two hotfixes

#### Summary: Changelog Extraction Behavior by Scenario

| Scenario | Last Deployed | New Deploy | OLD in NEW's CHANGELOG? | Behavior |
|----------|---------------|------------|-------------------------|----------|
| **Normal progression** | v1.2.0 (main) | v1.3.0 (main) | ✅ Yes | Shows v1.3.0 changes only |
| **Skip versions** | v1.2.0 (main) | v1.4.0 (main) | ✅ Yes | Shows v1.3.0 + v1.4.0 changes |
| **Hotfix → Hotfix** | v1.2.1 (hotfix) | v1.2.2 (hotfix) | ✅ Yes | Shows v1.2.2 changes only |
| **Main → Hotfix** | v1.2.0 (main) | v1.2.1 (hotfix) | ✅ Yes | Shows v1.2.1 changes only |
| **Hotfix → Main (divergent)** | v1.2.1 (hotfix) | v1.3.0 (main) | ❌ No | Shows all v1.3.0 lineage + warning note |

**Key principle:** Hotfix changes should be backmerged to main via separate commit. They will appear in future main releases through that backmerge, not through changelog comparison with the hotfix deployment.

#### 4. Why Checkout the Release Tag?

**Scenario:** Hotfix branch has different CHANGELOG.md than main

```
main branch CHANGELOG.md:
  ## [1.3.0] - 2026-04-20  ← Only exists on main
  ## [1.2.0] - 2026-04-15
  ## [1.1.0] - 2026-04-10

hotfix/v1.2.1 branch CHANGELOG.md (branched from v1.2.0):
  ## [1.2.1] - 2026-04-22  ← Created by semantic-release on hotfix branch
  ## [1.2.0] - 2026-04-15
  ## [1.1.0] - 2026-04-10

GitHub Release v1.2.1 created from hotfix branch (git commit abc123)
```

**If we checked out main:**
- ❌ CHANGELOG.md doesn't have [1.2.1]
- ❌ awk can't find NEW version → extraction fails
- ❌ No changelog content in release notes

**By checking out the release tag (v1.2.1):**
- ✅ Checks out commit abc123 (the hotfix branch commit)
- ✅ That commit has the updated CHANGELOG.md with [1.2.1]
- ✅ awk finds [1.2.1], extracts content successfully
- ✅ Changelog consolidation works even for hotfixes

This is why the workflow includes:
```yaml
- uses: actions/checkout@v4
  with:
    ref: ${{ inputs.release_tag }}  # ← Checkout the tag/commit, not main
```

## Files Updated from KOS.Datascience

### New Files
- `.github/workflows/consolidate-changelog.yml` — Consolidates changelogs before deployment
- `.github/workflows/mark-deployed.yml` — Updates status after deployment
- `doc/testing/TESTING_CHANGELOG.md` — This file

### Modified Files  
- `.github/workflows/deploy-stage.yml` — Added consolidate-changelog and mark-deployed jobs
- `.github/workflows/deploy-prod.yml` — Added consolidate-changelog and mark-deployed jobs, updated promote-release dependency
- `.github/workflows/release.yml` — Already matches KOS.Datascience flow
- `release.config.js` — Already matches KOS.Datascience config

### No Changes Needed
- `.github/workflows/deploy-dev.yml` — Dev deployment happens immediately, no consolidation needed
- `.github/workflows/deploy-template.yml` — Reusable workflow, works as-is

## Success Criteria

✅ Semantic release creates draft, promotes to prerelease  
✅ Consolidate-changelog finds last deployment and extracts CHANGELOG.md sections  
✅ Release notes show "Pending Deployment" before approval  
✅ Deploy workflow prints release info (doesn't fail)  
✅ Mark-deployed updates to "Deployed" with timestamp  
✅ Production promotion marks as "latest" (except hotfixes)  
✅ CHANGELOG.md remains untouched (managed only by semantic-release)  

## Cleanup Testing Data

If you want to reset:

```bash
# Delete all releases and tags
gh release list | cut -f1 | xargs -I {} gh release delete {} -y
git tag | xargs git tag -d
git push --delete origin $(git tag)

# Delete CHANGELOG.md to start fresh
git rm CHANGELOG.md
git commit -m "chore: reset for testing"
git push
```
