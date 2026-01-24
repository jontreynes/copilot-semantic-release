const currentBranch = process.env.GITHUB_REF_NAME || process.env.BRANCH || 'unknown';

// Extract base version from hotfix branch name (e.g., "hotfix/v3.6.12" -> "from-v3-6-12")
const getBaseVersionSuffix = (branchName) => {
  const match = branchName.match(/hotfix\/v?(\d+)\.(\d+)\.(\d+)/);
  if (branchName.startsWith('hotfix/') && !match) {
    throw new Error(`Invalid hotfix branch name: "${branchName}". Expected format: hotfix/v1.2.3 or hotfix/1.2.3`);
  }
  return match ? `v${match[1]}-${match[2]}-${match[3]}` : '';
};

const baseVersionSuffix = getBaseVersionSuffix(currentBranch);

const config = {
  branches: [
    'main',
    // Only configure the current hotfix branch for prerelease
    ...(currentBranch.startsWith('hotfix/') ? [{
      name: currentBranch,
      channel: currentBranch,
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
