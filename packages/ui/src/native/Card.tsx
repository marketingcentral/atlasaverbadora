import { StyleSheet, View, type ViewProps } from "react-native";
import { useTheme } from "./ThemeProvider.js";

interface Props extends ViewProps {}

export function Card({ style, children, ...rest }: Props) {
  const theme = useTheme();
  return (
    <View
      {...rest}
      style={[
        styles.card,
        { backgroundColor: theme.colors.bgElev, borderColor: theme.colors.border },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 8 },
});
