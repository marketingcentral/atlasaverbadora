import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "@atlas/ui/native";

interface Props { title: string; subtitle: string }

export function Placeholder({ title, subtitle }: Props) {
  const theme = useTheme();
  return (
    <View style={[styles.wrap, { backgroundColor: theme.colors.bg }]}>
      <Text style={[styles.title, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.sub, { color: theme.colors.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: 24, justifyContent: "center", alignItems: "center", gap: 12 },
  title: { fontSize: 22, fontWeight: "700" },
  sub: { fontSize: 14, textAlign: "center", maxWidth: 320, lineHeight: 20 },
});
