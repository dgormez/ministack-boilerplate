import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { applyAuthResponse } from "./auth";
import { storeRefreshToken } from "./api";
import type { AuthResponse } from "../types";

WebBrowser.maybeCompleteAuthSession();

const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
const IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     ?? "";
const WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? "";

export function useGoogleSignIn(baseUrl: string) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId:     IOS_CLIENT_ID,
    webClientId:     WEB_CLIENT_ID,
    scopes:          ["openid", "profile", "email"],
  });

  useEffect(() => {
    if (response?.type === "error") {
      setError("Google sign-in was cancelled or failed.");
      return;
    }
    if (response?.type !== "success") return;

    const idToken = response.authentication?.idToken;
    if (!idToken) {
      setError("Google sign-in failed — no ID token returned.");
      return;
    }

    setLoading(true);
    setError("");

    (async () => {
      try {
        const res = await fetch(`${baseUrl}/api/auth/google`, {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ idToken }),
        });

        if (!res.ok) throw new Error("Google sign-in failed. Please try again.");

        const data: AuthResponse = await res.json();
        await storeRefreshToken(data.refreshToken);
        applyAuthResponse(baseUrl, data);
        router.replace("/(tabs)");
      } catch (e: unknown) {
        setError((e as Error).message ?? "Google sign-in failed.");
      } finally {
        setLoading(false);
      }
    })();
  }, [response]);

  return {
    signIn:  () => { setError(""); promptAsync(); },
    loading,
    error,
    ready:   !!request,
  };
}
