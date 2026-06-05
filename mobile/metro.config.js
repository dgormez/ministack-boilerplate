const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind }   = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

// react-native-worklets (and reanimated) ship compiled JS that contains
// private class field syntax (#field). Hermes can't parse it unless Babel
// transpiles it first, so we override transformIgnorePatterns to include
// them in the transform pass.
config.transformer.transformIgnorePatterns = [
  'node_modules/(?!(react-native|@react-native|react-native-worklets|react-native-reanimated|expo|@expo|nativewind|@sentry|react-native-toast-message|react-native-safe-area-context|react-native-screens|react-native-get-random-values)/)',
];

module.exports = withNativeWind(config, { input: './global.css' });
