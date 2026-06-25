import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { useTheme } from "./ThemeProvider.js";

interface Props extends TextInputProps {
  label: string;
  error?: string;
}

export function Input({ label, error, style, ...rest }: Props) {
  const theme = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: theme.colors.textMuted }]}>{label.toUpperCase()}</Text>
      <TextInput
        placeholderTextColor={theme.colors.textDim}
        {...rest}
        style={[
          styles.input,
          {
            backgroundColor: theme.colors.surfaceSolid,
            borderColor: error ? theme.colors.danger : theme.colors.borderStrong,
            color: theme.colors.text,
          },
          style,
        ]}
      />
      {error ? <Text style={[styles.error, { color: theme.colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  error: { fontSize: 12 },
});
