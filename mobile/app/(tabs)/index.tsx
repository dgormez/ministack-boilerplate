import React from "react";
import {
  View, Text, FlatList, TouchableOpacity, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useStore } from "../../store/useStore";
import { useSync } from "../../hooks/useSync";

dayjs.extend(relativeTime);

export default function NotesScreen() {
  const router = useRouter();
  const { notes, isSyncing } = useStore();
  const { sync } = useSync();

  return (
    <View className="flex-1 bg-gray-900">

      {/* Header */}
      <View className="px-5 pt-16 pb-4 flex-row items-center justify-between">
        <Text className="text-white text-2xl font-bold">Notes</Text>
        <TouchableOpacity
          onPress={() => router.push("/note/add")}
          className="bg-blue-600 w-10 h-10 rounded-full items-center justify-center"
        >
          <Text className="text-white text-2xl font-bold leading-none">+</Text>
        </TouchableOpacity>
      </View>

      {/* List */}
      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 30 }}
        refreshControl={
          <RefreshControl
            refreshing={isSyncing}
            onRefresh={sync}
            tintColor="#3b82f6"
          />
        }
        ListEmptyComponent={
          <View className="items-center pt-24">
            <Text className="text-gray-500 text-lg">No notes yet</Text>
            <Text className="text-gray-600 text-sm mt-1">
              Tap + to create your first note
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => router.push(`/note/${item.id}`)}
            className="bg-gray-800 rounded-xl px-4 py-4 mb-3 active:opacity-70"
          >
            <Text className="text-white font-semibold text-base" numberOfLines={1}>
              {item.title}
            </Text>
            {!!item.body && (
              <Text className="text-gray-400 text-sm mt-1" numberOfLines={2}>
                {item.body}
              </Text>
            )}
            <Text className="text-gray-600 text-xs mt-2">
              {dayjs(item.updatedAt).fromNow()}
            </Text>
          </TouchableOpacity>
        )}
      />

    </View>
  );
}
