const currentBranch = process.env.GITHUB_REF_NAME || process.env.BRANCH || 'unknown';

const config = {
  branches: [
    'main',
    // Only configure the current hotfix branch for prerelease
    ...(currentBranch.startsWith('hotfix/') ? [{
      name: currentBranch,
      channel: currentBranch,
      prerelease: 'hotfix'
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
