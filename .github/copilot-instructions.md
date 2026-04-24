# Copilot Instructions

## Commit Message Convention

This repo uses a **modified Conventional Commits** format. Always generate commit messages in this format:

```
<type>(<optional scope>): <short description>

<optional body>
```

### Types — use EXACTLY these, in order of frequency

| Type       | When to use                                      | Semver bump |
|------------|--------------------------------------------------|-------------|
| `feat`     | New feature or capability                        | minor       |
| `patch`    | Bug fix or defect correction                     | patch       |
| `perf`     | Performance improvement                          | patch       |
| `revert`   | Reverting a previous commit                      | patch       |
| `refactor` | Code restructure with no behaviour change        | none        |
| `docs`     | Documentation only                               | none        |
| `chore`    | Maintenance, dependency updates, tooling         | none        |
| `ci`       | CI/CD workflow changes                           | none        |
| `build`    | Build system or packaging changes                | none        |
| `test`     | Adding or updating tests                         | none        |
| `style`    | Formatting, whitespace (no logic change)         | none        |

### Critical rule — NEVER use `fix:`

`fix`, `fixes`, and `fixed` are reserved keywords in the Azure Boards GitHub integration and will **automatically close or transition linked AB# work items** on merge. Use **`patch:`** instead for all bug fixes.

### Work item linking

- To **link only** (no state transition): `AB#1234` anywhere in the commit subject or body
- To **intentionally transition** a work item to Done/Closed: `Fixes AB#1234` in the PR description (not the commit message)

### Examples

```
feat(action): add support for matrix strategy in deploy template

patch(release): correct version extraction regex for hotfix branches AB#5678

perf: cache changelog extraction step to reduce workflow run time

ci: pin Node version to 20 in release workflow

chore(deps): bump @semantic-release/github to 10.1.0
```

### Breaking changes

Append `!` after the type and add a `BREAKING CHANGE:` footer:

```
feat!: remove support for legacy v1 action inputs

BREAKING CHANGE: The `environment` input has been renamed to `target_env`.
```
