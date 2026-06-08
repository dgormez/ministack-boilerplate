import React, { useState, useEffect } from "react";
import {
  View, TextInput, TouchableOpacity, Text,
  KeyboardAvoidingView, ActivityIndicator, Alert,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import Toast from "react-native-toast-message";
import { updateNote as apiUpdateNote, deleteNote as apiDeleteNote } from "../../services/api";
import { saveNotesLocally, deleteLocalNote } from "../../services/localDb";
import { useStore } from "../../store/useStore";
import { useColors } from "../../hooks/useColors";
import { ScreenContainer } from "../../components/ScreenContainer";

export default function EditNoteScreen() {
  const router = useRouter();
  const { id }  = useLocalSearchParams<{ id: string }>();
  const { notes, updateNote, removeNote } = useStore();
  const colors = useColors();

  const note = notes.find((n) => n.id === id);

  const [title,    setTitle]    = useState(note?.title ?? "");
  const [body,     setBody]     = useState(note?.body  ?? "");
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!note) router.back();
  }, [note]);

  const handleSave = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle || !id) return;

    setSaving(true);
    try {
      const updated = await apiUpdateNote(id, trimmedTitle, body.trim() || undefined);
      saveNotesLocally([updated]);
      updateNote(updated);
      router.back();
    } catch {
      Toast.show({ type: "error", text1: "Could not save note" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete note", "This note will be permanently deleted.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          if (!id) return;
          setDeleting(true);
          try {
            await apiDeleteNote(id);
            deleteLocalNote(id);
            removeNote(id);
            router.back();
          } catch {
            Toast.show({ type: "error", text1: "Could not delete note" });
            setDeleting(false);
          }
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView behavior="padding" className="flex-1 bg-white dark:bg-gray-900">
      <ScreenContainer>
      <View className="flex-1 px-5 pt-4">

        {/* Title */}
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Title"
          placeholderTextColor={colors.placeholder}
          returnKeyType="next"
          className="text-gray-900 dark:text-white text-2xl font-bold mb-4 py-2"
          style={{ fontSize: 24 }}
        />

        {/* Body */}
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Write something…"
          placeholderTextColor={colors.placeholder}
          multiline
          textAlignVertical="top"
          className="text-gray-700 dark:text-gray-300 text-base flex-1 py-2"
          style={{ fontSize: 16, lineHeight: 24 }}
        />

        {/* Actions */}
        <View className="flex-row gap-3 mb-6">
          <TouchableOpacity
            onPress={handleDelete}
            disabled={deleting || saving}
            className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-2xl py-4 items-center"
          >
            {deleting
              ? <ActivityIndicator color="#f87171" />
              : <Text className="text-red-500 dark:text-red-400 font-bold text-base">Delete</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSave}
            disabled={!title.trim() || saving || deleting}
            className={`flex-1 rounded-2xl py-4 items-center ${title.trim() && !saving ? "bg-blue-600" : "bg-gray-300 dark:bg-gray-600"}`}
          >
            {saving
              ? <ActivityIndicator color="#fff" />
              : <Text className="text-white font-bold text-base">Save</Text>
            }
          </TouchableOpacity>
        </View>

      </View>
      </ScreenContainer>
    </KeyboardAvoidingView>
  );
}
