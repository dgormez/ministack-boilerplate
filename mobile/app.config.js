const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
const iosReverseScheme = iosClientId
  ? `com.googleusercontent.apps.${iosClientId.split(".apps.googleusercontent.com")[0]}`
  : "";

/** @type {import('expo/config').ExpoConfig} */
module.exports = {
  expo: {
    name: "MiniStack",
    slug: "ministack",
    version: "1.0.0",
    orientation: "default",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#111827",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.dgit.ministack",
      entitlements: {
        "com.apple.developer.applesignin": ["Default"],
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // Allow plain HTTP to local dev server (remove before production)
        NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
        CFBundleURLTypes: [
          // Deep links: ministack://  (used by expo-router + password reset)
          { CFBundleURLSchemes: ["ministack"] },
          // Google OAuth callback scheme
          ...(iosReverseScheme ? [{ CFBundleURLSchemes: [iosReverseScheme] }] : []),
        ],
      },
    },
    android: {
      package: "com.dgit.ministack",
      versionCode: 1,
      usesCleartextTraffic: true,
      softwareKeyboardLayoutMode: "pan",
      adaptiveIcon: {
        foregroundImage: "./assets/images/adaptive-icon.png",
        backgroundColor: "#111827",
      },
    },
    plugins: [
      "expo-router",
      "expo-sqlite",
      "expo-secure-store",
      "expo-apple-authentication",
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#2563eb",
          sounds: [],
        },
      ],
      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
          organization: "YOUR_SENTRY_ORG",
          project: "YOUR_SENTRY_PROJECT",
        },
      ],
      "expo-web-browser",
    ],
    web: {
      bundler: "metro",
      output:  "static",
    },
    experiments: {
      typedRoutes: true,
    },
    scheme: "ministack",
    extra: {
      router: {},
      eas: {
        projectId: "YOUR_EAS_PROJECT_ID",
      },
    },
    runtimeVersion: {
      policy: "sdkVersion",
    },
    updates: {
      url: "https://u.expo.dev/YOUR_EAS_PROJECT_ID",
    },
  },
};
