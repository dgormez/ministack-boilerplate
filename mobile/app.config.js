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
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#111827",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.yourcompany.ministack",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        // Allow plain HTTP to local dev server (remove before production)
        NSAppTransportSecurity: { NSAllowsArbitraryLoads: true },
        ...(iosReverseScheme
          ? { CFBundleURLTypes: [{ CFBundleURLSchemes: [iosReverseScheme] }] }
          : {}),
      },
    },
    android: {
      package: "com.yourcompany.ministack",
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
