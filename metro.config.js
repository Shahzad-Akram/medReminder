const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Ensures Firebase resolves the React Native auth bundle (with AsyncStorage persistence).
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
