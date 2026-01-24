# Hotfix Workflow for Data Science Team

## Overview
This workflow allows hotfixing specific releases without affecting main branch development. The system uses **git history analysis** to automatically detect which version you're hotfixing - no strict branch naming required!

## How It Works

### Automatic Base Version Detection
The release system uses `git merge-base` to automatically detect which version your hotfix is based on:

1. **Git History Analysis**: Finds the common ancestor between your hotfix branch and main
2. **Tag Discovery**: Identifies the release tag that contains that common ancestor
3. **Version Extraction**: Uses that tag to create descriptive prerelease versions

**Example:**
```bash
# Create hotfix from any version - include version in branch name for fallback compatibility!
git checkout -b hotfix/v3.6.12-critical-data-bug v3.6.12
git commit -m "fix: prevent data corruption"
# → Automatic detection creates: v3.6.13-hotfix-from-v3-6-12.1
```

### Benefits of Git History Approach
- ✅ **Flexible naming**: Use descriptive branch names like `hotfix/v1.2.3-critical-data-bug`
- ✅ **Auto-detection**: Primary detection uses git history, not branch names
- ✅ **Accurate tracking**: Based on actual git history for reliability
- ✅ **Robust fallback**: Version in branch name ensures fallback works if git history fails

## Hotfix Types Supported

### Hotfix Branches (`hotfix/*`)
For urgent fixes that need to be applied to specific release versions.

**Workflow:**
```bash
# Create hotfix branch from the release tag you want to patch
# RECOMMENDED: Include version in branch name for fallback compatibility
git checkout -b hotfix/v1.2.3-critical-data-pipeline-bug v1.2.3

# Make your preparatory commits
git commit -m "wip: setup test data"
git commit -m "wip: add logging"

# Make your final fix with conventional commit
git commit -m "fix: critical data pipeline bug"

# Push hotfix branch (does NOT trigger release automatically)
git push origin hotfix/v1.2.3-critical-data-pipeline-bug
```

**Manual Release:**
1. Go to GitHub Actions → Release workflow
2. Click "Run workflow" 
3. Select your hotfix branch from dropdown
4. Click "Run workflow" to create the release

**Result:** 
- Git history analysis detects you're hotfixing v1.2.3
- Creates descriptive release: `v1.2.4-hotfix-from-v1-2-3.1`
- Works with any branch name - no version parsing required!

**⚠️ Version Conflict Scenario:** If v1.2.4 already exists from main, see [Version Conflicts](#version-conflicts) below.

## Branch Strategy

| Branch Pattern | Purpose | Release Trigger | Version Detection | Example Output |
|---------------|---------|----------------|------------------|----------------|
| `main` | Primary development | Automatic on push | Standard semver | v2.1.0 |
| `hotfix/*` | Targeted fixes | Manual workflow dispatch | Git history analysis | v1.2.4-hotfix-from-v1-2-3.1 |

### Git History-Based Detection
- **Flexible but recommended naming**: Use `hotfix/v1.2.3-descriptive-name` for reliability
- **Auto-detection**: Uses `git merge-base` for primary version detection
- **Robust fallback**: Version in branch name ensures compatibility if git commands fail
- **Descriptive versions**: Creates clear version names showing what's being hotfixed

## Best Practices

1. **Always branch from the specific release tag** you want to patch
2. **Use conventional commits** for proper version bumping
3. **Test thoroughly** in isolated environment before merging
4. **Document the hotfix** in CHANGELOG.md
5. **Consider backporting** to main if the issue exists there too

## GitHub Actions Integration

**Automatic releases:**
- `main` branch pushes automatically trigger releases

**Manual releases:**
- Hotfix branches require manual workflow dispatch
- Go to Actions → Release → "Run workflow" 
- Select your hotfix branch and click "Run workflow"
- This prevents accidental releases from prep commits

## Emergency Hotfix Process

1. **Identify the target release** to patch
2. **Create hotfix branch** from that release tag
3. **Make preparatory commits** (wip:, setup, etc.) 
4. **Apply final fix** with conventional commit message
5. **Push hotfix branch** (no release yet!)
6. **Manually trigger release** via GitHub Actions when ready
7. **Communicate** the hotfix to affected teams

## Example Scenarios

### Scenario 1: Critical Bug in Production (v2.0.0)
```bash
# Recommended naming - include version for fallback reliability!
git checkout -b hotfix/v2.0.0-data-corruption-emergency v2.0.0
git commit -m "wip: add debug logging"
git commit -m "wip: setup test case"
git commit -m "fix!: prevent data corruption in pipeline"
git push origin hotfix/v2.0.0-data-corruption-emergency

# Manual release via GitHub Actions workflow dispatch
# → Git history detects v2.0.0 base (primary method)
# → Creates v3.0.0-hotfix-from-v2-0-0.1 (breaking change) when you're ready
```

### Scenario 2: Performance Hotfix (v1.5.2)
```bash
# Recommended naming with version and description
git checkout -b hotfix/v1.5.2-optimize-query-performance v1.5.2
git commit -m "perf: optimize database query for large datasets"
git push origin hotfix/v1.5.2-optimize-query-performance

# Manual release triggers:
# → Git history auto-detects base version v1.5.2 (primary method)
# → Creates v1.5.3-hotfix-from-v1-5-2.1
```

This approach ensures your data science pipelines in production remain stable while allowing targeted fixes with clear, descriptive naming.

## Version Conflicts

### How Git History Solves Version Conflicts
The git history-based approach automatically creates descriptive prerelease versions that avoid conflicts:

### Example: Hotfixing v1.2.3 when v1.2.4 already exists
```bash
# Create hotfix branch with recommended naming (version + description)
git checkout -b hotfix/v1.2.3-critical-security-patch v1.2.3

# Apply your fix
git commit -m "fix: critical security vulnerability"

# Push and manually trigger release
git push origin hotfix/v1.2.3-critical-security-patch

# Result: v1.2.4-hotfix-from-v1-2-3.1 (no conflict with existing v1.2.4!)
```

### Benefits:
- ✅ **No version conflicts**: Prerelease versions never collide with main releases
- ✅ **Clear traceability**: Version name shows exactly what's being patched
- ✅ **Multiple hotfixes**: Can hotfix same version multiple times with different suffixes
- ✅ **Automatic**: No manual version calculation needed

### Legacy Branch Naming Support
The system still supports old naming conventions as a fallback:
```bash
# This still works - parsed from branch name if git history fails
git checkout -b hotfix/v1.2.3-legacy-fix v1.2.3
# → Creates: v1.2.4-hotfix-from-v1-2-3.1
```

## Technical Implementation

### Git History Detection Process
The system uses a multi-step process to determine hotfix base versions:

1. **Merge Base Detection**:
   ```bash
   git merge-base HEAD origin/main
   # Finds the common ancestor commit between hotfix branch and main
   ```

2. **Tag Discovery**:
   ```bash
   git describe --tags --abbrev=0 --contains <merge-base-commit>
   # Finds the release tag that contains the common ancestor
   ```

3. **Version Parsing**:
   - Extracts version numbers from the discovered tag
   - Converts to prerelease identifier format: `v3.6.12` → `from-v3-6-12`

4. **Fallback Strategy**:
   - If git history detection fails, attempts branch name parsing
   - If both fail, throws clear error to prevent prerelease conflicts

### Error Handling
- Graceful fallback to branch name parsing if git commands fail
- Clear error message if branch name doesn't contain version information
- Prevents prerelease identifier conflicts that would break semantic-release
- **Recommended**: Always include version in branch name for reliability

### Why This Approach?
- **Accurate**: Based on actual git history, not naming conventions
- **Flexible**: Works with any descriptive branch names
- **Robust**: Multiple fallback strategies prevent build failures
- **Traceable**: Clear version naming shows hotfix relationships
git push origin hotfix/v1.2.3-critical-bug-fix
# → Creates v1.2.3-hotfix.1 (clear it's patching v1.2.3)
```

Update `release.config.js`:
```javascript
branches: [
  'main',
  { name: 'hotfix/*', channel: 'hotfix', prerelease: 'hotfix' },
  // ... other branches
]
```

**Result:** `v1.2.3-hotfix.1`, `v1.2.3-hotfix.2`, etc. - **clearly shows you're patching v1.2.3**

### Solution 2: Use GitHub Run ID for Unique Traceability
For even more explicit traceability in your CI/CD:

Update `release.config.js`:
```javascript
branches: [
  'main',
  { name: 'hotfix/*', channel: 'hotfix', prerelease: `patch-${process.env.GITHUB_RUN_ID || 'local'}` },
  // ... other branches
]
```

**Result:** `v1.2.3-patch-12345.1` - **hotfix variant of the specific v1.2.3 version you're patching**

This approach works perfectly with semantic-release channel isolation!

### Solution 3: Use Maintenance Branch (Legacy Approach)
### Solution 3: Use Maintenance Branch (Legacy Approach)
```bash
# Creates confusing version numbers
git checkout v1.2.3
git checkout -b v1.2.x
git commit -m "fix: critical data pipeline bug"
git push origin v1.2.x
# → Creates v1.2.5 (confusing - what happened to v1.2.4?)
```

### Solution 4: Use Next Available Version
```bash
# Create maintenance branch from highest patch version
git checkout v1.2.4  # Use existing highest version
git checkout -b v1.2.x

# Apply fix
git commit -m "fix: critical data pipeline bug"  
git push origin v1.2.x
# → Creates v1.2.5
```

### Best Practice for Data Science Teams
**Use descriptive pre-releases** (`v1.2.3-hotfix.1`) rather than maintenance branches for production fixes. This provides:

- **Clear traceability**: Shows exactly which version you patched
- **No version confusion**: Doesn't skip version numbers like v1.2.5
- **CI/CD integration**: Can include GitHub run IDs for full audit trail
- **Safe deployment**: Pre-release tags are explicit about being hotfixes

## Channel Isolation Issues

### Problem: Conflicting Version Numbers
```
Timeline:
1. v1.2.3 (version you want to patch)
2. v1.2.4 (already exists from main branch)
3. v1.2.3-patch-389138.1 (hotfix branch - creates hotfix variant)
```

**This actually works perfectly!** You get:
- `v1.2.4` (main branch release)  
- `v1.2.3-patch-389138.1` (hotfix variant - patches v1.2.3 specifically)
- Next main patch → `v1.2.5`

### Recommended Workflow for Data Science
1. **Target version:** `v1.2.3` (version you want to patch)
2. **Main continues:** `v1.2.4` (independent release)  
3. **Hotfix variant:** `v1.2.3-patch-389138.1` (hotfix of v1.2.3 specifically)
4. **Next main patch:** `v1.2.5` (main branch continues normally)
5. **Clear separation:** Hotfix targets specific version, main continues independently