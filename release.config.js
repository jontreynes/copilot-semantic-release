const config = {
  branches: [
    'main',
    // Hotfix branches using commit SHA for unique but simple prerelease identifiers
    { 
      name: 'hotfix/*',
      channel: (branch) => branch.name,
      prerelease: () => process.env.GITHUB_SHA ? process.env.GITHUB_SHA.substring(0, 7) : 'hotfix'
    }
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
