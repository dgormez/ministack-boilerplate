import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  KeyboardAvoidingView, ScrollView, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { register } from "../../services/auth";

const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? "https://your-api.azurewebsites.net";

export default function RegisterScreen() {
  const router = useRouter();

  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");

  const handleRegister = async () => {
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);
    try {
      await register(API_BASE_URL, email.trim(), password);
      router.replace("/(tabs)");
    } catch (e: unknown) {
      setError((e as Error).message ?? "Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit =
    email.trim().length > 0 &&
    password.length >= 8 &&
    confirmPassword.length > 0 &&
    !loading;

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
            Create your account
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
            placeholder="Min 8 characters"
            placeholderTextColor="#6b7280"
            secureTextEntry
            returnKeyType="next"
            className="bg-gray-700 text-white rounded-xl px-4 py-4 mb-4"
          />

          {/* Confirm password */}
          <Text className="text-gray-300 text-sm font-medium mb-1">Confirm password</Text>
          <TextInput
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="••••••••"
            placeholderTextColor="#6b7280"
            secureTextEntry
            returnKeyType="done"
            onSubmitEditing={handleRegister}
            className="bg-gray-700 text-white rounded-xl px-4 py-4 mb-6"
          />

          {/* Create account button */}
          <TouchableOpacity
            onPress={handleRegister}
            disabled={!canSubmit}
            className={`rounded-2xl py-5 items-center ${canSubmit ? "bg-blue-600" : "bg-gray-600"}`}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white text-lg font-bold">Create account</Text>
            }
          </TouchableOpacity>

          {/* Login link */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="items-center py-4 mt-2"
          >
            <Text className="text-gray-400">
              Already have an account?{" "}
              <Text className="text-blue-400 font-semibold">Sign in</Text>
            </Text>
          </TouchableOpacity>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
