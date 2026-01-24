# Hotfix Workflow for Data Science Team

## Overview
This workflow allows hotfixing specific releases without affecting main branch development.

## Hotfix Types Supported

### Hotfix Branches (`hotfix/*`)
For urgent fixes that need to be applied to specific release versions.

**Workflow:**
```bash
# Create hotfix branch from the release tag you want to patch
git checkout -b hotfix/v1.2.3-critical-bug-fix v1.2.3

# Make your preparatory commits
git commit -m "wip: setup test data"
git commit -m "wip: add logging"

# Make your final fix with conventional commit
git commit -m "fix: critical data pipeline bug"

# Push hotfix branch (does NOT trigger release automatically)
git push origin hotfix/v1.2.3-critical-bug-fix
```

**Manual Release:**
1. Go to GitHub Actions → Release workflow
2. Click "Run workflow" 
3. Select your hotfix branch from dropdown
4. Click "Run workflow" to create the release

**Result:** Creates a patch release (e.g., v1.2.3-patch-12345.1) only when you manually trigger it.

**⚠️ Version Conflict Scenario:** If v1.2.4 already exists from main, see [Version Conflicts](#version-conflicts) below.

## Branch Strategy

| Branch Pattern | Purpose | Release Trigger | Example Output |
|---------------|---------|----------------|----------------|
| `main` | Primary development | Automatic on push | v2.1.0 |
| `hotfix/v*-issue-name` | Targeted fixes | Manual workflow dispatch | v1.2.3-patch-12345.1 |

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
git checkout -b hotfix/v2.0.0-data-corruption-fix v2.0.0
git commit -m "wip: add debug logging"
git commit -m "wip: setup test case"
git commit -m "fix!: prevent data corruption in pipeline"
git push origin hotfix/v2.0.0-data-corruption-fix

# Manual release via GitHub Actions workflow dispatch
# → Creates v3.0.0 (breaking change) when you're ready
```

This approach ensures your data science pipelines in production remain stable while allowing targeted fixes.

## Version Conflicts

### Problem: Target Version Already Exists
If you want to hotfix v1.2.3 → v1.2.4, but v1.2.4 already exists from main:

### Solution 1: Use Descriptive Pre-release (Recommended)
```bash
# Create hotfix branch from the version you want to patch
git checkout -b hotfix/v1.2.3-critical-bug-fix v1.2.3

# Apply your fix
git commit -m "fix: critical data pipeline bug"
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