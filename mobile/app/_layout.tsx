import "../global.css";
import * as Sentry from "@sentry/react-native";
import React, { useEffect, useState } from "react";
import { Stack, Redirect } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { View, ActivityIndicator, useColorScheme } from "react-native";
import Toast from "react-native-toast-message";

import { initDb, getLocalNotes, getLastSyncTime, getConfigValue, setConfigValue } from "../services/localDb";
import { configureApi } from "../services/api";
import { tryRestoreSession } from "../services/auth";
import { registerForPushNotifications } from "../services/notifications";
import { useStore } from "../store/useStore";
import { useSync } from "../hooks/useSync";
import { useColors } from "../hooks/useColors";

// ── Sentry crash reporting ────────────────────────────────────────────────────
// 1. Create a free project at https://sentry.io → React Native
// 2. Copy the DSN into your .env as EXPO_PUBLIC_SENTRY_DSN
// 3. Replace org/project slugs in app.json plugins
Sentry.init({
  dsn:               process.env.EXPO_PUBLIC_SENTRY_DSN ?? "",
  enabled:           !__DEV__,
  tracesSampleRate:  0.2,
  debug:             false,
});

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://your-api.azurewebsites.net";

// ── Root layout ───────────────────────────────────────────────────────────────

function RootLayout() {
  const colorScheme = useColorScheme();
  const [isReady,     setIsReady]     = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);

  const { auth, setNotes, setLastSyncAt } = useStore();
  const { sync } = useSync();
  const colors = useColors();

  // One-time bootstrap: restore session, then mark ready.
  useEffect(() => {
    async function bootstrap() {
      initDb();
      configureApi(API_BASE_URL);

      const sessionRestored = await tryRestoreSession(API_BASE_URL);
      const onboarded = getConfigValue("onboardingComplete") === "true";

      // Existing users who had no onboarding should skip it
      if (sessionRestored && !onboarded) setConfigValue("onboardingComplete", "true");

      setIsOnboarded(sessionRestored || onboarded);
      setIsReady(true);
    }
    bootstrap().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load notes from SQLite + background sync whenever the logged-in user changes.
  // Runs on initial login, session restore, and after logout → login.
  useEffect(() => {
    if (!isReady || !auth) return;
    setNotes(getLocalNotes(auth.userId));
    const lastSync = getLastSyncTime();
    if (lastSync) setLastSyncAt(lastSync);
    sync();
    registerForPushNotifications().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReady, auth?.userId]);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.header, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <>
      <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)"     options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)"     options={{ headerShown: false }} />
        <Stack.Screen
          name="note/add"
          options={{
            headerShown:     true,
            title:           "New Note",
            presentation:    "modal",
            headerStyle:     { backgroundColor: colors.header },
            headerTintColor: colors.headerText,
          }}
        />
        <Stack.Screen
          name="note/[id]"
          options={{
            headerShown:     true,
            title:           "Edit Note",
            presentation:    "modal",
            headerStyle:     { backgroundColor: colors.header },
            headerTintColor: colors.headerText,
          }}
        />
      </Stack>

      {/* Routing: onboarding → auth → app */}
      {!auth && !isOnboarded && <Redirect href="/onboarding" />}
      {!auth &&  isOnboarded && <Redirect href="/(auth)/login" />}

      <Toast />
    </>
  );
}

export default Sentry.wrap(RootLayout);
