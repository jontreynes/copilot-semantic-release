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
  return `v${major}-${minor}-${patch}`;
};

/**
 * Generate compare URL for hotfix releases
 * @param {string} branchName - Branch name
 * @param {string} newVersion - New release version
 * @returns {string} - Compare URL or empty string
 */
const generateCompareUrl = (branchName, newVersion) => {
  if (!branchName.startsWith('hotfix/')) {
    return '';
  }

  const versionMatch = branchName.match(/^hotfix\/v(\d+\.\d+\.\d+)/);
  if (!versionMatch) return '';

  const baseVersion = `v${versionMatch[1]}`;
  const repoUrl = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY || 'owner/repo'}`;
  
  return `\n\n🔍 **Review Changes**: [Compare ${baseVersion}...${newVersion}](${repoUrl}/compare/${baseVersion}...${newVersion})`;
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
    ["@semantic-release/release-notes-generator", {
      "preset": "conventionalcommits",
      "writerOpts": {
        "transform": (commit, context) => {
          // Add compare URL for hotfix releases
          if (currentBranch.startsWith('hotfix/') && context.version) {
            commit.compareUrl = generateCompareUrl(currentBranch, `v${context.version}`);
          }
          return commit;
        }
      }
    }],
    '@semantic-release/changelog',
    ["@semantic-release/github", {
      "assets": [
        {"path": "release-artifacts/*.tar.gz", "label": "Release Artifact"},
        {"path": "release-artifacts/deployment-manifest.json", "label": "Deployment Manifest"}
      ],
      "successComment": false,
      "failComment": false,
      "releasedLabels": ["released"]
    }]
  ]
};

module.exports = config;
