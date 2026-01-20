const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add support for Agora SDK
config.resolver.alias = {
  ...config.resolver.alias,
};

config.resolver.assetExts = [
  ...config.resolver.assetExts,
  'wasm'
];

// Ensure Agora SDK modules are included
config.resolver.platforms = ['ios', 'android', 'native', 'web'];

module.exports = config;
