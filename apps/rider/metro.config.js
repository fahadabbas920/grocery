// Metro config for an Expo app inside a pnpm monorepo.
// Watches the workspace root so changes to shared packages hot-reload, and
// resolves modules from both the app and the root node_modules.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
// pnpm uses symlinks; let Metro follow them.
config.resolver.unstable_enableSymlinks = true;

// pnpm stores multiple RN versions in the virtual store; block anything that
// isn't 0.81.x so the wrong codegen doesn't run (e.g. 0.85 pulled in by
// packages/db's optional async-storage peer resolution).
const RN_WRONG_VERSION = /node_modules[/\\]\.pnpm[/\\]react-native@(?!0\.81\.)/;
config.resolver.blockList = [RN_WRONG_VERSION];

module.exports = config;
