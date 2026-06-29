const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// pnpm monorepo: resolve packages from workspace root
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Windows: Watchman often fails to start ("Failed to start watch mode"),
// which leaves Metro's DependencyGraph uninitialized and returns HTTP 500.
if (process.platform === 'win32') {
  config.watcher = {
    ...config.watcher,
    healthCheck: {
      enabled: true,
      interval: 30000,
      timeout: 10000,
    },
  };
}

module.exports = config;
