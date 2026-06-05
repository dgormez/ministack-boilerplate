import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { login } from "../../services/auth";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://your-api.azurewebsites.net";

export default function LoginScreen() {
  const router = useRouter();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await login(API_BASE_URL, email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = email.trim().length > 0 && password.length > 0 && !loading;

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-gray-900">
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-1 px-6 justify-center pb-10">

          {/* Header */}
          <Text className="text-5xl text-center mb-3">📝</Text>
          <Text className="text-white text-3xl font-bold text-center mb-2">MiniStack</Text>
          <Text className="text-gray-400 text-center text-base mb-10">
            Sign in to your account
          </Text>

          {/* Error banner */}
          {!!error && (
            <View className="bg-red-900/50 border border-red-500 rounded-xl px-4 py-3 mb-5">
              <Text className="text-red-300 text-sm">{error}</Text>
            </View>
          )}

          {/* Email */}
          <Text className="text-gray-300 text-sm font-medium mb-1">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
            keyboardType="email-address"
            returnKeyType="next"
            className="bg-gray-700 text-white rounded-xl px-4 py-4 mb-4"
          />

          {/* Password */}
          <Text className="text-gray-300 text-sm font-medium mb-1">Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#6b7280"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            className="bg-gray-700 text-white rounded-xl px-4 py-4 mb-6"
          />

          {/* Sign in button */}
          <TouchableOpacity
            onPress={handleLogin}
            disabled={!canSubmit}
            className={`rounded-2xl py-5 items-center ${canSubmit ? "bg-blue-600" : "bg-gray-600"}`}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white text-lg font-bold">Sign in</Text>
            }
          </TouchableOpacity>

          {/* Register link */}
          <TouchableOpacity
            onPress={() => router.push("/(auth)/register")}
            className="items-center py-4 mt-2"
          >
            <Text className="text-gray-400">
              Don&apos;t have an account?{" "}
              <Text className="text-blue-400 font-semibold">Create one</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
