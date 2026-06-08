import { useColorScheme } from "react-native";

export function useColors() {
  const dark = useColorScheme() === "dark";
  return {
    placeholder: dark ? "#6b7280" : "#9ca3af",
    tabBar:      dark ? "#1f2937" : "#ffffff",
    tabBorder:   dark ? "#374151" : "#e5e7eb",
    header:      dark ? "#1f2937" : "#ffffff",
    headerText:  dark ? "#ffffff" : "#111827",
  };
}
