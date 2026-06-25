import { StyleSheet, Text, View } from "react-native";

export type PillVariant = "pendente" | "aceita" | "averbado" | "emdia" | "expirado" | "rejeitada";

const palette: Record<PillVariant, { bg: string; color: string }> = {
  pendente: { bg: "rgba(245,158,11,0.18)", color: "#F59E0B" },
  aceita: { bg: "rgba(16,185,129,0.18)", color: "#10B981" },
  averbado: { bg: "rgba(16,185,129,0.22)", color: "#34D399" },
  emdia: { bg: "rgba(59,130,246,0.18)", color: "#3B82F6" },
  expirado: { bg: "rgba(100,116,139,0.18)", color: "#94A3B8" },
  rejeitada: { bg: "rgba(220,38,38,0.18)", color: "#DC2626" },
};

export function Pill({ variant, label }: { variant: PillVariant; label: string }) {
  const p = palette[variant];
  return (
    <View style={[styles.wrap, { backgroundColor: p.bg }]}>
      <Text style={[styles.txt, { color: p.color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, alignSelf: "flex-start" },
  txt: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
});
