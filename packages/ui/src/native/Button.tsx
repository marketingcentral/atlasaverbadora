import { Pressable, StyleSheet, Text, type PressableProps } from "react-native";
import { useTheme } from "./ThemeProvider.js";

type Variant = "primary" | "ghost" | "success";

interface Props extends Omit<PressableProps, "children"> {
  label: string;
  variant?: Variant;
}

export function Button({ label, variant = "primary", style, ...rest }: Props) {
  const theme = useTheme();
  const bg = variant === "primary" ? theme.colors.accent : variant === "success" ? theme.colors.success : theme.colors.surface;
  const color = variant === "ghost" ? theme.colors.text : theme.colors.bg;
  const borderColor = variant === "ghost" ? theme.colors.borderStrong : "transparent";
  return (
    <Pressable
      {...rest}
      style={(state) => [
        styles.btn,
        { backgroundColor: bg, borderColor, opacity: state.pressed ? 0.85 : 1 },
        typeof style === "function" ? style(state) : style,
      ]}
    >
      <Text style={[styles.label, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 15, fontWeight: "600" },
});
