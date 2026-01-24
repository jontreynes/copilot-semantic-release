const { execSync } = require('child_process');
const currentBranch = process.env.GITHUB_REF_NAME || process.env.BRANCH || 'unknown';

/**
 * Git history-based approach to detect hotfix base version
 * Uses git merge-base to find the common ancestor with main branch,
 * then finds the closest release tag to determine what version we're hotfixing
 * This approach is more flexible - works with any hotfix branch name
 * 
 * @param {string} branchName - Current branch name
 * @returns {string} - Base version suffix for prerelease identifier (e.g., "from-v3-6-12")
 */
const getBaseVersionFromGitHistory = (branchName) => {
  // Only process hotfix branches
  if (!branchName.startsWith('hotfix/')) {
    return '';
  }
  
  try {
    // Find the merge-base (common ancestor) between current branch and main
    const mergeBase = execSync('git merge-base HEAD origin/main', { encoding: 'utf8' }).trim();
    
    // Find the most recent release tag that contains this merge-base commit
    // This tells us which version this hotfix is based on
    const baseTag = execSync(`git describe --tags --abbrev=0 --contains ${mergeBase}`, { 
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'] // Suppress stderr to avoid noise
    }).trim();
    
    // Convert tag to prerelease suffix format (v3.6.12 -> from-v3-6-12)
    const versionMatch = baseTag.match(/v?(\d+)\.(\d+)\.(\d+)/);
    if (versionMatch) {
      return `from-v${versionMatch[1]}-${versionMatch[2]}-${versionMatch[3]}`;
    }
    
    console.warn(`Could not parse version from tag: ${baseTag}`);
    return 'from-unknown-version';
    
  } catch (error) {
    console.warn('Failed to detect base version from git history:', error.message);
    // Fallback: extract from branch name if it follows convention
    const match = branchName.match(/hotfix\/v?(\d+)\.(\d+)\.(\d+)/);
    if (match) {
      console.log(`Falling back to branch name parsing: ${branchName}`);
      return `from-v${match[1]}-${match[2]}-${match[3]}`;
    }
    // If all else fails, throw error to prevent prerelease identifier conflicts
    throw new Error(`Invalid hotfix branch name: "${branchName}". Expected format: hotfix/v1.2.3 or hotfix/1.2.3`);
  }
};

const baseVersionSuffix = getBaseVersionFromGitHistory(currentBranch);

const config = {
  branches: [
    'main',
    // Current branch isolation approach: Only configure the active hotfix branch
    // This prevents EPRERELEASEBRANCHES conflicts when multiple hotfix branches exist
    // Uses git history to auto-detect base version instead of parsing branch names
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
