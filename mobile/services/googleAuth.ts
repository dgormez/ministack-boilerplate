import { useEffect, useState } from "react";
import { useRouter } from "expo-router";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import Constants from "expo-constants";
import { applyAuthResponse } from "./auth";
import { storeRefreshToken } from "./api";
import type { AuthResponse } from "../types";

WebBrowser.maybeCompleteAuthSession();

const ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID ?? "";
const IOS_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID     ?? "";
const WEB_CLIENT_ID     = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID     ?? "";

const isExpoGo = Constants.appOwnership === "expo";

// For Expo Go: use the auth.expo.io proxy.
// For native builds (expo run:ios / run:android): Google requires the reverse
// client ID scheme (com.googleusercontent.apps.XXXXX:/oauthredirect).
// Google Cloud Console → iOS client → bundle ID com.yourcompany.ministack.
const iosReverseScheme = IOS_CLIENT_ID
  ? `com.googleusercontent.apps.${IOS_CLIENT_ID.split(".apps.googleusercontent.com")[0]}`
  : "";

const redirectUri = isExpoGo
  ? "https://auth.expo.io/@lahoule/ministack"
  : makeRedirectUri({ native: `${iosReverseScheme}:/oauthredirect` });

export function useGoogleSignIn(baseUrl: string) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    iosClientId:     IOS_CLIENT_ID,
    webClientId:     WEB_CLIENT_ID,
    scopes:          ["openid", "profile", "email"],
    redirectUri,
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

        if (!res.ok) {
          let message = "Google sign-in failed. Please try again.";
          try {
            const body = await res.json();
            if (body?.error) message = body.error;
            else if (res.status === 401) message = "Google authentication was rejected by the server.";
            else if (res.status >= 500) message = `Server error (${res.status}). Please try again later.`;
          } catch {}
          throw new Error(message);
        }

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
    signIn:      () => { setError(""); promptAsync({ useProxy: isExpoGo }); },
    clearError:  () => setError(""),
    loading,
    error,
    ready:       !!request,
  };
}
