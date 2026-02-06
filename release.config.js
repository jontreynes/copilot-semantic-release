const currentBranch = process.env.GITHUB_REF_NAME || process.env.BRANCH || 'unknown';

/**
 * Extract base version from hotfix branch name
 * Enforces naming convention: hotfix/v1.2.3-description
 * 
 * @param {string} branchName - Branch name (e.g., "hotfix/v1.0.1-critical-bug")
 * @returns {string} - Formatted version for prerelease (e.g., "v1-0-1")
 */
const getBaseVersionFromBranchName = (branchName) => {
  if (!branchName.startsWith('hotfix/')) {
    return '';
  }

  // Extract version from branch name: hotfix/v1.0.1-description (v prefix required)
  const versionMatch = branchName.match(/^hotfix\/v(\d+)\.(\d+)\.(\d+)/);
  
  if (!versionMatch) {
    throw new Error(
      `Invalid hotfix branch name: "${branchName}". ` +
      `Expected format: hotfix/v1.2.3-description (v prefix required)`
    );
  }

  const [, major, minor, patch] = versionMatch;
  return `v${major}.${minor}.${patch}`;
};

const baseVersionSuffix = getBaseVersionFromBranchName(currentBranch);

const config = {
  branches: [
    'main',
    // Current branch isolation approach: Only configure the active hotfix branch
    // This prevents EPRERELEASEBRANCHES conflicts when multiple hotfix branches exist
    // Uses simple branch name parsing - reliable and fast
    ...(currentBranch.startsWith('hotfix/') ? [{
      name: currentBranch,
      channel: currentBranch, // Isolate each hotfix to its own channel
      prerelease: baseVersionSuffix ? `hotfix-from-${baseVersionSuffix.replace(/\./g, '-')}` : 'hotfix'
    }] : [])
  ],
  plugins: [
    ["@semantic-release/commit-analyzer", {
      "preset": "conventionalcommits"
    }],
    ["@semantic-release/release-notes-generator", {
      "preset": "conventionalcommits",
      "writerOpts": {
        "finalizeContext": (context) => {
          // Simple approach: reuse the existing baseVersionSuffix
          if (currentBranch.startsWith('hotfix/') && context.version && baseVersionSuffix) {
            const repoUrl = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY || 'owner/repo'}`;
            
            const compareLink = `\n\n🔍 **Review Changes**: [Compare ${baseVersionSuffix}...v${context.version}](${repoUrl}/compare/${baseVersionSuffix}...v${context.version})`;
            
            // Add to the last existing note instead of creating a new bullet
            if (context.noteGroups && context.noteGroups.length > 0) {
              const lastGroup = context.noteGroups[context.noteGroups.length - 1];
              if (lastGroup.notes && lastGroup.notes.length > 0) {
                const lastNote = lastGroup.notes[lastGroup.notes.length - 1];
                lastNote.text = (lastNote.text || '') + compareLink;
              } else {
                // If no notes exist, add as new note but with proper text
                lastGroup.notes = lastGroup.notes || [];
                lastGroup.notes.push({ text: compareLink.trim() });
              }
            } else {
              // Fallback: create a note group
              context.noteGroups = [{ title: '', notes: [{ text: compareLink.trim() }] }];
            }
          }
          return context;
        }
      }
    }],
    '@semantic-release/changelog',
    ["@semantic-release/npm", {
      "npmPublish": false  // Updates package.json but doesn't publish to npm
    }],
    ["@semantic-release/git", {
      "assets": ["package.json", "package-lock.json", "CHANGELOG.md"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    ["@semantic-release/github", {
      "assets": [
        {"path": "release-artifacts/*.tar.gz", "label": "Release Artifact"},
        {"path": "release-artifacts/deployment-manifest.json", "label": "Deployment Manifest"}
      ],
      "successComment": false,
      "failComment": false,
      "releasedLabels": ["released"],
      "prerelease": true,  // All releases start as prerelease
      "makeLatest": "false"  // Explicitly prevent marking as latest (string value required for GitHub API)
    }]
  ]
};

module.exports = config;
