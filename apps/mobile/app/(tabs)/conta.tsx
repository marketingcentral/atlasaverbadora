import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { Button, Card, useTheme, useThemeMode } from "@atlas/ui/native";
import { clearSession } from "../../src/lib/sdk";

export default function Conta() {
  const theme = useTheme();
  const { mode, setMode } = useThemeMode();
  const router = useRouter();

  async function logout() {
    await clearSession();
    router.replace("/(auth)/login");
  }

  return (
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.scroll}>
      <Text style={[styles.title, { color: theme.colors.text }]}>Conta</Text>

      <Card>
        <Text style={[styles.section, { color: theme.colors.textMuted }]}>APARENCIA</Text>
        <View style={styles.row}>
          {(["system", "light", "dark"] as const).map((m) => (
            <Button key={m} label={m} variant={mode === m ? "primary" : "ghost"} onPress={() => setMode(m)} />
          ))}
        </View>
      </Card>

      <Button label="Sair" variant="ghost" onPress={logout} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, gap: 16 },
  title: { fontSize: 24, fontWeight: "800" },
  section: { fontSize: 11, letterSpacing: 1, fontWeight: "700", marginBottom: 12 },
  row: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
});
