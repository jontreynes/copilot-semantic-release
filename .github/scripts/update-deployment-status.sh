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

# Build the pending and deployed headers
if [[ "$OLD_VERSION" == "initial" ]]; then
  PENDING_HEADER="## 📦 Pending Deployment to ${ENVIRONMENT} | Initial Deployment"
  DEPLOYED_HEADER="## 📦 Deployed to ${ENVIRONMENT} | Initial Deployment | ${TIMESTAMP}"
else
  PENDING_HEADER="## 📦 Pending Deployment to ${ENVIRONMENT} | ${OLD_VERSION} → ${NEW_VERSION}"
  DEPLOYED_HEADER="## 📦 Deployed to ${ENVIRONMENT} | ${OLD_VERSION} → ${NEW_VERSION} | ${TIMESTAMP}"
fi

echo "🔍 Looking for: $PENDING_HEADER"

# First try exact match
FOUND_EXACT=false
if echo "$CURRENT_BODY" | grep -qF "$PENDING_HEADER" 2>/dev/null; then
  FOUND_EXACT=true
  echo "✅ Found exact pending deployment header"
fi

# If exact match not found, search for any pending deployment to this environment
if [[ "$FOUND_EXACT" == false ]]; then
  echo "🔍 Exact match not found, searching for any pending deployment to ${ENVIRONMENT}..."
  PENDING_LINE=$(echo "$CURRENT_BODY" | grep "^## 📦 Pending Deployment to ${ENVIRONMENT} |" || true)
  
  if [[ -n "$PENDING_LINE" ]]; then
    echo "✅ Found pending deployment line: $PENDING_LINE"
    PENDING_HEADER="$PENDING_LINE"
    
    # Extract version info from the found header to build deployed header
    if echo "$PENDING_LINE" | grep -q "Initial Deployment"; then
      DEPLOYED_HEADER="## 📦 Deployed to ${ENVIRONMENT} | Initial Deployment | ${TIMESTAMP}"
    else
      # Extract the version range from the pending header
      VERSION_RANGE=$(echo "$PENDING_LINE" | sed 's/^## 📦 Pending Deployment to .* | //')
      DEPLOYED_HEADER="## 📦 Deployed to ${ENVIRONMENT} | ${VERSION_RANGE} | ${TIMESTAMP}"
    fi
    
    echo "📝 Will replace with: $DEPLOYED_HEADER"
    FOUND_EXACT=true
  fi
fi

# Check if pending header exists  
if [[ "$FOUND_EXACT" == true ]]; then
  echo "✅ Found pending deployment section, updating to deployed status..."
  
  # Save current body to temp file
  echo "$CURRENT_BODY" > /tmp/current_body.txt
  
  # Use awk to replace the pending header with deployed header (handles unicode)
  awk -v pending="$PENDING_HEADER" -v deployed="$DEPLOYED_HEADER" '
  {
      if ($0 == pending) {
          print deployed
      } else {
          print $0
      }
  }
  ' /tmp/current_body.txt > /tmp/release_body.md
  
  # Update release notes
  gh release edit "$RELEASE_TAG" --notes-file /tmp/release_body.md
  
  echo "✅ Release notes updated with deployed status"
else
  echo "⚠️  Pending deployment section not found in release notes"
  echo "⚠️  This might happen if:"
  echo "    - Deployment was done without running consolidate-changelog"
  echo "    - Release notes were manually edited"
  echo "    - This is a retry after manual intervention"
  echo ""
  echo "📋 Current release body headers:"
  echo "$CURRENT_BODY" | grep "^## " || echo "  (no headers found)"
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
