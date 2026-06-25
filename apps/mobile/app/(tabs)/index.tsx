import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { MargemCard, useTheme } from "@atlas/ui/native";
import { atlas } from "../../src/lib/sdk";

export default function Home() {
  const theme = useTheme();
  const profile = useQuery({ queryKey: ["me"], queryFn: () => atlas.getMyProfile() });
  const margem = useQuery({ queryKey: ["margem"], queryFn: () => atlas.getMyMargem() });

  if (profile.isLoading || margem.isLoading) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg }]}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }
  if (profile.error || margem.error) {
    return (
      <View style={[styles.center, { backgroundColor: theme.colors.bg, padding: 24 }]}>
        <Text style={{ color: theme.colors.danger, textAlign: "center" }}>
          {(profile.error ?? margem.error) instanceof Error ? (profile.error ?? margem.error)!.message : "Erro"}
        </Text>
      </View>
    );
  }

  const initials = (profile.data?.nome ?? "?")
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  return (
    <ScrollView style={{ backgroundColor: theme.colors.bg }} contentContainerStyle={styles.scroll}>
      <View style={styles.header}>
        <View style={[styles.avatar, { backgroundColor: theme.colors.accent }]}>
          <Text style={{ color: theme.colors.bg, fontWeight: "800" }}>{initials}</Text>
        </View>
        <View>
          <Text style={{ color: theme.colors.textMuted, fontSize: 12 }}>Bem-vindo(a),</Text>
          <Text style={{ color: theme.colors.text, fontSize: 18, fontWeight: "700" }}>{profile.data?.nome}</Text>
        </View>
      </View>

      {margem.data ? <MargemCard data={margem.data} prefeitura={`Prefeitura · ${profile.data?.matricula}`} /> : null}

      <View style={{ marginTop: 8 }}>
        <Text style={[styles.section, { color: theme.colors.textMuted }]}>O QUE VOCE QUER FAZER</Text>
        <View style={styles.grid}>
          <Action label="Simular" sub="Emprestimo" theme={theme} />
          <Action label="Propostas" sub="Sem pendencias" theme={theme} />
          <Action label="Contratos" sub="—" theme={theme} />
          <Action label="Ofertas" sub="—" theme={theme} />
        </View>
      </View>
    </ScrollView>
  );
}

function Action({ label, sub, theme }: { label: string; sub: string; theme: ReturnType<typeof useTheme> }) {
  return (
    <View style={[styles.action, { backgroundColor: theme.colors.bgElev, borderColor: theme.colors.border }]}>
      <Text style={{ color: theme.colors.text, fontWeight: "700" }}>{label}</Text>
      <Text style={{ color: theme.colors.textDim, fontSize: 12, marginTop: 4 }}>{sub}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  scroll: { padding: 20, gap: 20 },
  header: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  section: { fontSize: 11, letterSpacing: 1, fontWeight: "700", marginBottom: 12 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  action: { width: "47%", padding: 16, borderRadius: 14, borderWidth: 1 },
});
