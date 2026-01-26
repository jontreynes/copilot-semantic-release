# Hotfix Workflow for Data Science Team

## Overview
This workflow allows hotfixing specific releases without affecting main branch development. The system uses **branch naming conventions** to reliably detect which version you're hotfixing - simple, fast, and dependable!

## How It Works

### Branch Naming Convention Detection
The release system extracts version information directly from your branch name:

1. **Branch Name Parsing**: Extracts version from `hotfix/v3.7.0-description` format
2. **Version Validation**: Ensures branch follows the required naming pattern
3. **Prerelease Creation**: Generates descriptive versions like `v3.7.1-hotfix-from-v3-7-0.1`

**Example:**
```bash
# Create hotfix with required naming convention (v prefix required)
git checkout -b hotfix/v3.6.12-critical-data-bug v3.6.12
git commit -m "fix: prevent data corruption"
# → Creates: v3.6.13-hotfix-from-v3-6-12.1
#    ^^^^^^^ Next semantic version (not v3.6.12!)
#                      ^^^^^^^^^^^^ Shows which version we're hotfixing
```

**Key Point**: Due to semantic versioning limitations, we can't release v3.6.12 again. Instead:
- **Release version**: `v3.6.13` (next semantic version)
- **Prerelease identifier**: `hotfix-from-v3-6-12` (shows origin)
- **Build number**: `.1` (increments for multiple releases from same branch)

### Benefits of Branch Naming Approach
- ✅ **Reliable**: No dependency on git history or merge conflicts
- ✅ **Fast**: Simple string parsing - no git commands required
- ✅ **Clear**: Version is explicitly stated in branch name
- ✅ **Predictable**: Same branch name always produces same result

## Hotfix Types Supported

### Hotfix Branches (`hotfix/*`)
For urgent fixes that need to be applied to specific release versions.

**Required Naming Convention:**
- `hotfix/v{version}-{description}` (e.g., `hotfix/v1.2.3-critical-bug`)
- **Note**: 'v' prefix is required to prevent duplicate branches

**Workflow:**
```bash
# Create hotfix branch from the release tag you want to patch
# REQUIRED: Include version in branch name following convention
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
- Branch name parsing detects you're hotfixing v1.2.3
- **Creates release**: `v1.2.4-hotfix-from-v1-2-3.1`
  - `v1.2.4` = Next semantic version (can't reuse v1.2.3)
  - `hotfix-from-v1-2-3` = Shows which version we're patching
  - `.1` = First release from this hotfix branch
- Fast and reliable - no git commands needed!

**⚠️ Version Conflict Scenario:** If v1.2.4 already exists from main, see [Version Conflicts](#version-conflicts) below.

## Branch Strategy

| Branch Pattern | Purpose | Release Trigger | Version Detection | Example Output |
|---------------|---------|----------------|------------------|----------------|
| `main` | Primary development | Automatic on push | Standard semver | v2.1.0 |
| `hotfix/v*.*.*-*` | Targeted fixes | Manual workflow dispatch | Branch name parsing | v1.2.4-hotfix-from-v1-2-3.1 |

### Branch Naming Convention
- **Required format**: `hotfix/v{version}-{description}` (v prefix required)
- **Version extraction**: Direct parsing from branch name
- **Prevents duplicates**: Single format eliminates confusion between teams

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
# Required naming convention - version must be in branch name
git checkout -b hotfix/v2.0.0-data-corruption-emergency v2.0.0
git commit -m "wip: add debug logging"
git commit -m "wip: setup test case"
git commit -m "fix!: prevent data corruption in pipeline"
git push origin hotfix/v2.0.0-data-corruption-emergency

# Manual release via GitHub Actions workflow dispatch
# → Branch name parsing extracts v2.0.0 base version
# → Creates v3.0.0-hotfix-from-v2-0-0.1 (breaking change)
#    ^^^^^^^ Next major version (due to fix!)
#                      ^^^^^^^^^ Shows we're hotfixing v2.0.0
```

### Scenario 2: Performance Hotfix (v1.5.2)
```bash
# Required naming with version and description
git checkout -b hotfix/v1.5.2-optimize-query-performance v1.5.2
git commit -m "perf: optimize database query for large datasets"
git push origin hotfix/v1.5.2-optimize-query-performance

# Manual release triggers:
# → Branch name parsing extracts base version v1.5.2
# → Creates v1.5.3-hotfix-from-v1-5-2.1
#    ^^^^^^^ Next patch version
#                      ^^^^^^^^^ Shows origin version
```

### Scenario 3: Multiple Hotfixes from Same Branch
```bash
# First release from hotfix branch
git checkout -b hotfix/v1.2.3-security-fixes v1.2.3
git commit -m "fix: patch vulnerability A"
# → Manual release creates: v1.2.4-hotfix-from-v1-2-3.1

# Additional fix on same branch
git commit -m "fix: patch vulnerability B"
# → Manual release creates: v1.2.4-hotfix-from-v1-2-3.2
#                                                    ^^^ Increments!
```

### Scenario 4: Invalid Branch Name (Error)
```bash
# ❌ This will fail with clear error:
git checkout -b hotfix/urgent-data-fix v1.2.3
git commit -m "fix: urgent issue"
git push origin hotfix/urgent-data-fix

# Error during release:
# Invalid hotfix branch name: "hotfix/urgent-data-fix". 
# Expected format: hotfix/v1.2.3-description (v prefix required)

# ❌ This would also fail (missing v prefix):
git checkout -b hotfix/1.2.3-data-fix v1.2.3  # Missing 'v' prefix
```

This approach ensures your data science pipelines in production remain stable while enforcing clear, predictable naming conventions.

## Version Conflicts

### Understanding Hotfix Version Numbering

**Important**: Due to semantic versioning rules, we cannot release the same version twice. Here's how our system handles this:

#### The Problem
```bash
# You want to hotfix v1.2.3, but:
# ❌ Cannot release v1.2.3 again (already exists)
# ❌ Cannot go backwards to v1.2.2
```

#### The Solution: Next Version + Traceability
```bash
# Our approach:
git checkout -b hotfix/v1.2.3-critical-fix v1.2.3
# → Creates: v1.2.4-hotfix-from-v1-2-3.1
#    ^^^^^^^ Next valid semantic version
#                      ^^^^^^^^^ Shows which version we're hotfixing
```

### How Branch Naming Solves Version Conflicts
The branch naming convention automatically creates descriptive prerelease versions that avoid conflicts:

### Example: Hotfixing v1.2.3 when v1.2.4 already exists
```bash
# Create hotfix branch with required naming convention
git checkout -b hotfix/v1.2.3-critical-security-patch v1.2.3

# Apply your fix
git commit -m "fix: critical security vulnerability"

# Push and manually trigger release
git push origin hotfix/v1.2.3-critical-security-patch

# Result: v1.2.5-hotfix-from-v1-2-3.1
#         ^^^^^^^ Next available semantic version (v1.2.4 was taken)
#                           ^^^^^^^^^ Clear traceability to v1.2.3
```

**Timeline Example:**
1. `v1.2.3` - Original production version (has a bug)
2. `v1.2.4` - Released from main branch (unrelated feature)
3. `v1.2.5-hotfix-from-v1-2-3.1` - Hotfix for v1.2.3 (skips to next available version)

### Benefits:
- ✅ **No version conflicts**: Each hotfix gets next available semantic version
- ✅ **Clear traceability**: Prerelease identifier shows origin version (e.g., `hotfix-from-v1-2-3`)
- ✅ **Multiple hotfixes**: Can create multiple releases from same hotfix branch (.1, .2, .3)
- ✅ **Semantic compliance**: Follows strict semantic versioning rules
- ✅ **Audit trail**: Full history of which versions were hotfixed and when

### Required Branch Format:
```bash
# ✅ Valid format (v prefix required):
git checkout -b hotfix/v1.2.3-security-fix v1.2.3
git checkout -b hotfix/v2.5.1-performance-patch v2.5.1
git checkout -b hotfix/v3.0.0-critical-data-bug v3.0.0

# ❌ Invalid formats (will error):
git checkout -b hotfix/urgent-fix                 # No version
git checkout -b hotfix/1.2.3-no-v-prefix         # Missing 'v' prefix
git checkout -b hotfix/fix-the-bug                # No version
```

**Why single format?**
- ✅ **Prevents duplicate work**: No confusion between `hotfix/v1.2.3-bug` and `hotfix/1.2.3-bug`
- ✅ **Consistent with git tags**: Matches `v1.2.3` tag naming convention
- ✅ **Clear and explicit**: 'v' makes version immediately recognizable

## Technical Implementation

### Branch Name Parsing Process
The system uses a simple and reliable process to determine hotfix base versions:

1. **Branch Name Validation**:
   ```javascript
   // Validates branch follows required pattern (v prefix required)
   const versionMatch = branchName.match(/^hotfix\/v(\d+)\.(\d+)\.(\d+)/);
   ```

2. **Version Extraction**:
   ```javascript
   // Extracts major, minor, patch from branch name
   const [, major, minor, patch] = versionMatch;
   return `v${major}-${minor}-${patch}`;
   ```

3. **Prerelease Identifier Creation**:
   - Converts extracted version to prerelease format
   - Example: `v3.7.0` → `v3-7-0` → `hotfix-from-v3-7-0`

### Semantic-Release Configuration

Our release.config.js implements the branch naming convention with this function:

```javascript
/**
 * Extract base version from hotfix branch name
 * Enforces naming convention: hotfix/v1.2.3-description
 * This is the most reliable approach - no dependency on complex git history
 */
const getBaseVersionFromBranchName = (branchName) => {
  if (!branchName.startsWith('hotfix/')) return '';
  
  // Extract version from branch name: hotfix/v3.7.0-description (v prefix required)
  const versionMatch = branchName.match(/^hotfix\/v(\d+)\.(\d+)\.(\d+)/);
  
  if (!versionMatch) {
    throw new Error(
      `Invalid hotfix branch name: "${branchName}". ` +
      `Expected format: hotfix/v1.2.3-description (v prefix required)`
    );
  }

  const [, major, minor, patch] = versionMatch;
  return `v${major}-${minor}-${patch}`;
};
```

### Error Handling
- Clear error message if branch name doesn't follow convention
- Immediate feedback during release process
- Prevents semantic-release conflicts with descriptive error:
  ```
  Invalid hotfix branch name: "hotfix/urgent-fix". 
  Expected format: hotfix/v1.2.3-description (v prefix required)
  ```
- **Prevents duplicate work**: Single format eliminates confusion

### Why This Approach?
- **Simple**: Just string parsing, no external git commands
- **Fast**: No network calls or git operations required
- **Reliable**: Not affected by merge conflicts, rebases, or git history
- **Semantic version compliant**: Uses next valid version (can't reuse existing versions)
- **Traceable**: Prerelease identifier shows exactly which version is being hotfixed
- **Multiple hotfixes**: Supports multiple releases from same hotfix branch (.1, .2, .3)
- **Team-friendly**: Enforces clear naming conventions that prevent duplicate branches

### Semantic Versioning Limitations & Solutions

**The Challenge**: 
- Cannot release v1.2.3 twice (semantic versioning rule)
- Need clear traceability to show which version was hotfixed

**Our Solution**:
```
Branch: hotfix/v1.2.3-bug-fix
→ Release: v1.2.4-hotfix-from-v1-2-3.1
          ^^^^^^^ Next valid semantic version
                            ^^^^^^^^^^^^^ Traceability identifier
                                        ^^ Build increment
```

**Benefits**:
- ✅ **Compliance**: Follows semantic versioning strictly
- ✅ **Traceability**: Clear connection to original version
- ✅ **No conflicts**: Each hotfix gets unique version
- ✅ **Audit trail**: Build numbers track multiple releases
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