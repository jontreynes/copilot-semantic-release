# Testing Changelog Consolidation

This repo is a test environment for the changelog consolidation feature before deploying to KOS.Datascience.

For concrete before/after examples of what release notes look like at each stage, see [release_notes_cases.md](release_notes_cases.md).

## What This Tests

- **Changelog consolidation** — Extracts changelog entries between releases and updates GitHub Release notes
- **Two-step status markers** — "Pending Deployment" → "Deployed" transition
- **Latest Only design** — The `## 📦` section is *replaced* (not appended) each time a new environment consolidates
- **Release flow** — Semantic release → Stage → Prod deployment chain
- **Hotfix workflow** — Prerelease creation, hotfix stays as prerelease after prod

## What's Different from KOS.Datascience?

- **No actual deployments** — `deploy-template.yml` just prints info, doesn't deploy to Databricks
- **Simplified structure** — No Databricks bundle validation or asset downloads
- **Same release logic** — Semantic-release, hotfix handling, and changelog consolidation work identically
- **Environment names** — `stage` / `prod` (KOS uses `Staging` / `Production`)

## Quick Test Procedure

### 1. Create Test Releases

```bash
git checkout main && git pull

git commit --allow-empty -m "feat: add feature A" && git push
git commit --allow-empty -m "feat: add feature B" && git push
git commit --allow-empty -m "fix: resolve bug C" && git push
```

Semantic-release will automatically create v1.0.0, v1.1.0, v1.2.0 (or similar).

### 2. Deploy to Stage

1. Go to **Actions → Deploy to Stage** → Run workflow
2. Enter the release tag (e.g., `v1.2.0`) and run

**What to verify:**
- `consolidate-changelog` appends `## 📦 Pending Deployment to stage | ...` to the release notes
- `approval` job pauses — check release notes look correct before approving
- `deploy` job runs (prints info only)
- `mark-deployed` updates the header to `## 📦 Deployed to stage | ... | <timestamp>`

### 3. Deploy to Prod

Same flow using **Actions → Deploy to Prod**.

**Key difference from stage:** `consolidate-changelog` **replaces** the existing `## 📦 Deployed to stage` section with a new `## 📦 Pending Deployment to prod` section.

After `mark-deployed`, `promote-release` marks the release as **latest** (skipped for hotfixes).

## Edge Cases to Test

See [release_notes_cases.md](release_notes_cases.md) for expected before/after release notes for all scenarios:

- First deployment to an environment
- Skipping versions between deployments
- Redeploying the same version
- Stage deployed but prod never runs
- Hotfix releases (stays as prerelease)
- Regular release after a hotfix (divergent lineages)

## Debugging

### Check Last Deployment
```bash
gh api /repos/Ecolab-IT/daves-youtube-demo-action/actions/workflows/deploy-stage.yml/runs \
  --field status=completed \
  --field conclusion=success \
  --field per_page=3
```

### View Current Release Notes
```bash
gh release view v1.2.0 --json body -q .body
```

### Test CHANGELOG.md Extraction Locally
```bash
# Run the extract script directly against CHANGELOG.md
.github/scripts/extract-changelog.sh v1.0.0 v1.3.0 /tmp/out.md && cat /tmp/out.md
```

> **Note:** The workflow checks out the release tag, not main. This is required for hotfixes — the hotfix branch has a different `CHANGELOG.md` than main (it contains the hotfix version that main doesn't know about yet).

## Success Criteria

✅ Semantic release creates draft, promotes to prerelease  
✅ Consolidate-changelog finds last deployment and extracts CHANGELOG.md sections  
✅ Release notes show "Pending Deployment" before approval  
✅ Deploy workflow prints release info (doesn't fail)  
✅ Mark-deployed updates to "Deployed" with timestamp  
✅ Stage section is **replaced** (not duplicated) when prod consolidation runs  
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
