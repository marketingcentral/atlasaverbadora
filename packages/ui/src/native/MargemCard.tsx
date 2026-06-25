import { StyleSheet, Text, View } from "react-native";
import { useTheme } from "./ThemeProvider.js";
import type { MargemResponse } from "@atlas/types";

interface Props {
  data: MargemResponse;
  prefeitura?: string;
}

const fmtBRL = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);

export function MargemCard({ data, prefeitura }: Props) {
  const theme = useTheme();
  const { margem } = data;
  const usedPct = Math.round(margem.percentual_uso * 100);
  return (
    <View style={[styles.card, { borderColor: theme.colors.border }]}>
      <Text style={styles.label}>MARGEM DISPONIVEL</Text>
      <Text style={styles.big}>{fmtBRL(margem.disponivel)}</Text>
      <View style={styles.barBg}>
        <View style={[styles.barFill, { width: `${usedPct}%` }]} />
      </View>
      <View style={styles.meta}>
        <Text style={styles.metaTxt}>Utilizada {fmtBRL(margem.comprometido)}</Text>
        <Text style={styles.metaTxt}>Total {fmtBRL(margem.salario_base * 0.35)}</Text>
      </View>
      {prefeitura ? <Text style={styles.pref}>{prefeitura}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    backgroundColor: "#1A2942",
    gap: 8,
  },
  label: { color: "#9BAAC2", fontSize: 11, fontWeight: "700", letterSpacing: 1 },
  big: { color: "#10B981", fontSize: 32, fontWeight: "800", marginTop: 4 },
  barBg: { height: 6, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 3, marginTop: 10, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: "#C9A961" },
  meta: { flexDirection: "row", justifyContent: "space-between", marginTop: 8 },
  metaTxt: { color: "#C7D2E0", fontSize: 13 },
  pref: { color: "#C9A961", fontSize: 12, marginTop: 4 },
});
