import React, { useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, FlatList,
  useWindowDimensions, NativeScrollEvent, NativeSyntheticEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { setConfigValue } from "../services/localDb";

const SLIDES = [
  {
    icon:     "📝",
    title:    "Welcome to MiniStack",
    subtitle: "A fast, clean notes app. Capture ideas the moment they happen.",
  },
  {
    icon:     "☁️",
    title:    "Syncs everywhere",
    subtitle: "Your notes stay in sync across all your devices. Works offline too.",
  },
  {
    icon:     "🔒",
    title:    "Private & secure",
    subtitle: "Sign in with Google or email. Your notes belong to you.",
  },
];

export default function OnboardingScreen() {
  const router   = useRouter();
  const { width } = useWindowDimensions();
  const slideWidth = Math.min(width, 640);
  const listRef  = useRef<FlatList>(null);
  const [index, setIndex] = useState(0);

  const finish = () => {
    setConfigValue("onboardingComplete", "true");
    router.replace("/(auth)/login");
  };

  const next = () => {
    if (index < SLIDES.length - 1) {
      listRef.current?.scrollToIndex({ index: index + 1, animated: true });
    } else {
      finish();
    }
  };

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const newIndex = Math.round(e.nativeEvent.contentOffset.x / slideWidth);
    if (newIndex !== index) setIndex(newIndex);
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <View className="flex-1 bg-white dark:bg-gray-900 items-center">
      <View style={{ flex: 1, width: slideWidth }}>

        {/* Skip button */}
        <View className="absolute top-14 right-6 z-10">
          {!isLast && (
            <TouchableOpacity onPress={finish} className="py-2 px-3">
              <Text className="text-gray-400 dark:text-gray-500 text-sm font-medium">Skip</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Slides */}
        <FlatList
          ref={listRef}
          data={SLIDES}
          keyExtractor={(_, i) => String(i)}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          renderItem={({ item }) => (
            <View style={{ width: slideWidth }} className="flex-1 items-center justify-center px-10">
              <Text style={{ fontSize: 80 }} className="mb-8">{item.icon}</Text>
              <Text className="text-gray-900 dark:text-white text-3xl font-bold text-center mb-4">
                {item.title}
              </Text>
              <Text className="text-gray-500 dark:text-gray-400 text-base text-center leading-7">
                {item.subtitle}
              </Text>
            </View>
          )}
        />

        {/* Bottom controls */}
        <View className="pb-14 px-6">

        {/* Dot indicators */}
        <View className="flex-row justify-center gap-2 mb-8">
          {SLIDES.map((_, i) => (
            <View
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === index
                  ? "w-6 bg-blue-600"
                  : "w-2 bg-gray-300 dark:bg-gray-600"
              }`}
            />
          ))}
        </View>

        {/* CTA button */}
        <TouchableOpacity
          onPress={next}
          className="bg-blue-600 rounded-2xl py-5 items-center"
        >
          <Text className="text-white text-lg font-bold">
            {isLast ? "Get started" : "Next"}
          </Text>
        </TouchableOpacity>

        </View>

      </View>
    </View>
  );
}
