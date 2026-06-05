import React, { useState } from "react";
import {
  View, TextInput, TouchableOpacity, Text,
  KeyboardAvoidingView, ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";
import { createNote } from "../../services/api";
import { saveNotesLocally } from "../../services/localDb";
import { useStore } from "../../store/useStore";

export default function AddNoteScreen() {
  const router = useRouter();
  const { addNote } = useStore();

  const [title,   setTitle]   = useState("");
  const [body,    setBody]    = useState("");
  const [saving,  setSaving]  = useState(false);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;

    setSaving(true);
    try {
      const note = await createNote(trimmedTitle, body.trim() || undefined);
      saveNotesLocally([note]);
      addNote(note);
      router.back();
    } catch {
      Toast.show({ type: "error", text1: "Could not save note", text2: "Check your connection and try again." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-gray-900">
      <View className="flex-1 px-5 pt-4">

        {/* Title */}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor="#6b7280"
          autoFocus
          returnKeyType="next"
          className="text-white text-2xl font-bold mb-4 py-2"
          style={{ fontSize: 24 }}
        />

        {/* Body */}
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Start writing…"
          placeholderTextColor="#6b7280"
          multiline
          textAlignVertical="top"
          className="text-gray-300 text-base flex-1 py-2"
          style={{ fontSize: 16, lineHeight: 24 }}
        />

        {/* Save button */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={!title.trim() || saving}
          className={`rounded-2xl py-4 items-center mb-6 ${title.trim() && !saving ? "bg-blue-600" : "bg-gray-600"}`}
        >
          {saving
            ? <ActivityIndicator color="#fff" />
            : <Text className="text-white font-bold text-base">Save note</Text>
          }
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  );
}
