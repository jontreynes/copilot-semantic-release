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
```bash
OLD_VERSION="v1.0.0"
NEW_VERSION="v1.2.0"

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
