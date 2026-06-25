import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import * as LocalAuthentication from "expo-local-authentication";
import { Button, Input, useTheme } from "@atlas/ui/native";
import { atlas } from "../../src/lib/sdk";

export default function Login() {
  const router = useRouter();
  const theme = useTheme();
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function login() {
    if (!cpf || !password) {
      Alert.alert("Atencao", "Preencha CPF e senha");
      return;
    }
    setLoading(true);
    try {
      await atlas.login({ identifier: cpf, password });
      router.replace("/(tabs)");
    } catch (err) {
      Alert.alert("Falha no login", err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  }

  async function loginBiometrico() {
    const hasHw = await LocalAuthentication.hasHardwareAsync();
    if (!hasHw) {
      Alert.alert("Indisponivel", "Biometria nao suportada neste dispositivo");
      return;
    }
    const res = await LocalAuthentication.authenticateAsync({ promptMessage: "Entrar no Atlas" });
    if (!res.success) return;
    // In real flow, biometric unlocks an existing refresh-token; here we just go to home if there is a session.
    Alert.alert("Demo", "Em producao a biometria desbloqueia o refresh token armazenado.");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.colors.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={[styles.brandRow]}>
          <View style={styles.mark}>
            <Text style={styles.markTxt}>A</Text>
          </View>
          <View>
            <Text style={[styles.brandTitle, { color: theme.colors.text }]}>Atlas Averbadora</Text>
            <Text style={[styles.brandSub, { color: theme.colors.textDim }]}>Aplicativo do servidor</Text>
          </View>
        </View>

        <View style={styles.form}>
          <Input label="CPF" value={cpf} onChangeText={setCpf} placeholder="000.111.222-33" keyboardType="number-pad" autoComplete="username" />
          <Input label="Senha" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
          <Button label={loading ? "Entrando..." : "Entrar"} onPress={login} disabled={loading} />
          <Button label="Entrar com biometria" variant="ghost" onPress={loginBiometrico} />
        </View>

        <View style={styles.help}>
          <Text style={[styles.helpTitle, { color: theme.colors.textMuted }]}>SANDBOX</Text>
          <Text style={{ color: theme.colors.textDim, fontFamily: theme.font.mono, fontSize: 12 }}>
            CPF: 00011122233{"\n"}Senha: teste
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 24, gap: 24, flexGrow: 1, justifyContent: "center" },
  brandRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  mark: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: "#C9A961",
    alignItems: "center", justifyContent: "center",
  },
  markTxt: { color: "#0A1628", fontWeight: "800", fontSize: 22 },
  brandTitle: { fontWeight: "700", fontSize: 18 },
  brandSub: { fontSize: 13, marginTop: 2 },
  form: { gap: 16 },
  help: { marginTop: 24, paddingTop: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: "#94A3B8" },
  helpTitle: { fontSize: 11, letterSpacing: 1, fontWeight: "700", marginBottom: 6 },
});
