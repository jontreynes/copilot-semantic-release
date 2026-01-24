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