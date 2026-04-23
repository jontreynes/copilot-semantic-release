#!/bin/bash
# Extract changelog entries between two versions
#
# This script extracts changelog entries between two versions from CHANGELOG.md
# Handles three scenarios:
#   1. Normal case (same lineage): Both versions exist in CHANGELOG.md
#   2. Divergent lineage: OLD version doesn't exist in NEW's CHANGELOG.md
#   3. Hotfix-to-hotfix (same lineage): Both versions exist in CHANGELOG.md
#
# Usage: extract-changelog.sh <old_version> <new_version> <output_file>

set -e

OLD_VERSION="$1"
NEW_VERSION="$2"
OUTPUT_FILE="$3"

if [[ -z "$OLD_VERSION" || -z "$NEW_VERSION" || -z "$OUTPUT_FILE" ]]; then
  echo "Usage: $0 <old_version> <new_version> <output_file>"
  exit 1
fi

echo "📄 Extracting changelog from $OLD_VERSION to $NEW_VERSION..."

# Check if CHANGELOG.md exists
if [[ ! -f "CHANGELOG.md" ]]; then
  echo "❌ CHANGELOG.md not found"
  exit 1
fi

# Normalize versions (strip 'v' prefix for comparison)
OLD_VERSION_NORMALIZED="${OLD_VERSION#v}"
NEW_VERSION_NORMALIZED="${NEW_VERSION#v}"

echo "🔍 Searching for versions: $OLD_VERSION_NORMALIZED to $NEW_VERSION_NORMALIZED"

# Check if OLD version exists in NEW version's CHANGELOG.md (detect divergent lineages)
OLD_EXISTS=$(grep -c "^## \[v\?${OLD_VERSION_NORMALIZED}\]" CHANGELOG.md || true)

if [[ "$OLD_EXISTS" -eq 0 ]]; then
  echo "⚠️  Old version $OLD_VERSION not found in $NEW_VERSION CHANGELOG.md"
  echo "⚠️  This indicates divergent branch lineages (e.g., main-branch release after hotfix)"
  echo "📋 Will show all changes in $NEW_VERSION release lineage"
  DIVERGENT_LINEAGE="true"
else
  DIVERGENT_LINEAGE="false"
fi

# Extract changelog between versions
EXTRACTED=$(awk -v old="$OLD_VERSION_NORMALIZED" -v new="$NEW_VERSION_NORMALIZED" '
  BEGIN { 
    in_range=0
    found_new=0
    found_old=0
  }
  /^## \[/ {
    version = $0
    gsub(/^## \[v?/, "", version)
    gsub(/\].*$/, "", version)
    
    # Check if we hit the new version
    if (version == new) {
      found_new=1
      in_range=1
      print $0
      next
    }
    
    # Check if we hit the old version (stop extracting)
    if (version == old) {
      found_old=1
      in_range=0
      exit
    }
    
    # If in range, print the section
    if (in_range) {
      print $0
      next
    }
  }
  {
    if (in_range) {
      print $0
    }
  }
' CHANGELOG.md)

# Add note for divergent lineages
if [[ "$DIVERGENT_LINEAGE" == "true" && -n "$EXTRACTED" ]]; then
  EXTRACTED="${EXTRACTED}

---
**Note:** Previous deployment ($OLD_VERSION) was from a different branch lineage (e.g., hotfix). This shows all changes in the $NEW_VERSION release lineage. If hotfix changes should persist, they must be backmerged separately."
fi

if [[ -z "$EXTRACTED" ]]; then
  echo "⚠️  No changelog entries found between $OLD_VERSION and $NEW_VERSION"
  echo "⚠️  This might be a redeploy of the same version"
  EXTRACTED="No new changes since $OLD_VERSION"
fi

# Save to output file
echo "$EXTRACTED" > "$OUTPUT_FILE"

echo "✅ Changelog extracted successfully to $OUTPUT_FILE"
