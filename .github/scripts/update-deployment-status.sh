#!/bin/bash
# Mark a release as deployed to an environment by updating release notes
# Usage: ./update-deployment-status.sh <release_tag> <environment> <old_version> <new_version> <github_repository>

set -e

RELEASE_TAG="$1"
ENVIRONMENT="$2"
OLD_VERSION="$3"
NEW_VERSION="$4"
GITHUB_REPOSITORY="$5"

# Default to release_tag if new_version not provided
if [[ -z "$NEW_VERSION" ]]; then
  NEW_VERSION="$RELEASE_TAG"
fi

# If old_version is empty, treat as initial deployment
if [[ -z "$OLD_VERSION" ]]; then
  OLD_VERSION="initial"
fi

echo "✅ Marking deployment as complete..."
echo "Release: $RELEASE_TAG"
echo "Environment: $ENVIRONMENT"
echo "Version Range: $OLD_VERSION → $NEW_VERSION"

# Get current release body
CURRENT_BODY=$(gh release view "$RELEASE_TAG" --json body -q .body 2>/dev/null)

if [[ -z "$CURRENT_BODY" ]]; then
  echo "❌ Release $RELEASE_TAG not found"
  exit 1
fi

# Generate timestamp in UTC
TIMESTAMP=$(date -u +"%Y-%m-%d %H:%M UTC")

# Match the ⏳ pending bullet for this environment
echo "🔍 Looking for pending bullet for ${ENVIRONMENT}..."

# Save current body to temp file
echo "$CURRENT_BODY" > /tmp/current_body.txt

# Find the pending line by prefix — captures whatever version range is embedded in the bullet
FOUND_PENDING=$(grep "^- ⏳ Pending deployment to ${ENVIRONMENT}" /tmp/current_body.txt || true)

if [[ -n "$FOUND_PENDING" ]]; then
  echo "✅ Found pending deployment entry: $FOUND_PENDING"

  # Build deployed line: swap ⏳ Pending deployment to → ✅ Deployed to, append timestamp
  DEPLOYED_LINE=$(echo "$FOUND_PENDING" | sed "s/^- ⏳ Pending deployment to /- ✅ Deployed to /")
  DEPLOYED_LINE="${DEPLOYED_LINE} — ${TIMESTAMP}"

  # Replace first occurrence only
  awk -v pending="$FOUND_PENDING" -v deployed="$DEPLOYED_LINE" '
  BEGIN { done=0 }
  {
    if (!done && $0 == pending) {
      print deployed
      done=1
    } else {
      print $0
    }
  }
  ' /tmp/current_body.txt > /tmp/release_body.md

  # Update release notes
  gh release edit "$RELEASE_TAG" --notes-file /tmp/release_body.md

  echo "✅ Release notes updated with deployed status"
else
  echo "⚠️  Pending deployment entry not found in release notes"
  echo "⚠️  This might happen if:"
  echo "    - Deployment was done without running consolidate-changelog"
  echo "    - Release notes were manually edited"
  echo "    - This is a retry after manual intervention"
  echo ""
  echo "📋 Current release body bullets:"
  grep "^- " /tmp/current_body.txt || echo "  (no bullet lines found)"
  echo ""
  echo "ℹ️  Skipping status update (not blocking deployment)"
fi

# Output summary
echo "### ✅ Deployment Completed" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "**Environment**: ${ENVIRONMENT}" >> $GITHUB_STEP_SUMMARY
echo "**Version Range**: ${OLD_VERSION} → ${NEW_VERSION}" >> $GITHUB_STEP_SUMMARY
echo "**Deployed At**: ${TIMESTAMP}" >> $GITHUB_STEP_SUMMARY
echo "" >> $GITHUB_STEP_SUMMARY
echo "[View Release Notes](https://github.com/${GITHUB_REPOSITORY}/releases/tag/${RELEASE_TAG})" >> $GITHUB_STEP_SUMMARY
