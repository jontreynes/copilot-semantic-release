const currentBranch = process.env.GITHUB_REF_NAME || process.env.BRANCH || 'unknown';

/**
 * Extract base version from hotfix branch name
 * Enforces naming convention: hotfix/v1.2.3-description
 * This is the most reliable approach - no dependency on complex git history
 * 
 * @param {string} branchName - Branch name (e.g., "hotfix/v3.7.0-critical-bug")
 * @returns {string} - Formatted version for prerelease (e.g., "v3-7-0")
 */
const getBaseVersionFromBranchName = (branchName) => {
  if (!branchName.startsWith('hotfix/')) {
    return '';
  }

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
      prerelease: baseVersionSuffix ? `hotfix-from-${baseVersionSuffix}` : 'hotfix'
    }] : [])
  ],
  plugins: [
    ["@semantic-release/commit-analyzer", {
      "preset": "conventionalcommits"
    }],
    '@semantic-release/release-notes-generator',
    '@semantic-release/changelog',
    ["@semantic-release/npm", {
      "npmPublish": false
    }],
    ["@semantic-release/git", {
      "assets": ["package.json", "package-lock.json", "CHANGELOG.md", "dist/*.js", "dist/*.js.map"],
      "message": "chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}"
    }],
    '@semantic-release/github'
  ]
};

module.exports = config;
