# Semantic Release Rules Documentation

This document outlines the default release rules used by semantic-release with the `conventionalcommits` preset.

## Default Release Rules

For the complete and up-to-date list of default release rules, refer to the official source:

**[Default Release Rules](https://github.com/semantic-release/commit-analyzer/blob/master/lib/default-release-rules.js)** - Official default release rules used by semantic-release commit analyzer

## Breaking Changes

Any commit type with `!` or `BREAKING CHANGE:` in the body triggers a **Major** release:

- `feat!: remove old API` → 1.0.0 → 2.0.0
- `fix!: change function signature` → 1.0.0 → 2.0.0
- Commit with `BREAKING CHANGE:` in body → 1.0.0 → 2.0.0

## Official Documentation

- **[Conventional Commits Specification](https://www.conventionalcommits.org/)** - Official specification for conventional commit format
- **[Semantic Release Documentation](https://semantic-release.gitbook.io/)** - Complete semantic-release documentation
- **[Commit Analyzer Plugin](https://github.com/semantic-release/commit-analyzer)** - Plugin that analyzes commits and determines release type
- **[Conventional Commits Parser](https://github.com/conventional-changelog/conventional-changelog/tree/master/packages/conventional-commits-parser)** - Parser used by semantic-release

## Configuration

Our current configuration uses the `conventionalcommits` preset with default rules:

```javascript
["@semantic-release/commit-analyzer", {
  "preset": "conventionalcommits"
}]
```

This automatically applies all the default rules listed above without needing explicit `releaseRules` configuration.

## Hotfix Branch Configuration

### Git History-Based Version Detection

Our hotfix system uses **git history analysis** to automatically detect base versions instead of parsing branch names:

```javascript
/**
 * Git history-based approach to detect hotfix base version
 * Uses git merge-base to find the common ancestor with main branch,
 * then finds the closest release tag to determine what version we're hotfixing
 */
const getBaseVersionFromGitHistory = (branchName) => {
  if (!branchName.startsWith('hotfix/')) return '';
  
  try {
    // Find common ancestor between current branch and main
    const mergeBase = execSync('git merge-base HEAD origin/main');
    
    // Find the release tag that contains this ancestor
    const baseTag = execSync(`git describe --tags --abbrev=0 --contains ${mergeBase}`);
    
    // Convert to prerelease identifier: v3.6.12 → from-v3-6-12
    const versionMatch = baseTag.match(/v?(\d+)\.(\d+)\.(\d+)/);
    return versionMatch ? `from-v${versionMatch[1]}-${versionMatch[2]}-${versionMatch[3]}` : 'hotfix';
  } catch (error) {
    // Fallback to branch name parsing or generic identifier
    return extractFromBranchName(branchName) || 'hotfix';
  }
};
```

### Benefits:
- ✅ **Flexible naming**: Use descriptive branch names like `hotfix/critical-data-bug`
- ✅ **Automatic detection**: No need to embed versions in branch names
- ✅ **Accurate tracking**: Based on actual git history, not naming conventions
- ✅ **Fallback support**: Still works with legacy `hotfix/v1.2.3` naming

### Example Outputs:
- `hotfix/critical-bug` from v3.6.12 → `v3.6.13-hotfix-from-v3-6-12.1`
- `hotfix/performance-fix` from v2.1.0 → `v2.1.1-hotfix-from-v2-1-0.1`
- `hotfix/v1.5.2-legacy` (fallback) → `v1.5.3-hotfix-from-v1-5-2.1`