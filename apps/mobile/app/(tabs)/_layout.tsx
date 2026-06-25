import { Tabs } from "expo-router";
import { Text } from "react-native";
import { useTheme } from "@atlas/ui/native";

function Icon({ glyph, color }: { glyph: string; color: string }) {
  return <Text style={{ color, fontSize: 18 }}>{glyph}</Text>;
}

export default function TabsLayout() {
  const theme = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.accent,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.bgElev,
          borderTopColor: theme.colors.border,
        },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Inicio", tabBarIcon: ({ color }) => <Icon glyph="⌂" color={color} /> }} />
      <Tabs.Screen name="propostas" options={{ title: "Propostas", tabBarIcon: ({ color }) => <Icon glyph="≡" color={color} /> }} />
      <Tabs.Screen name="contratos" options={{ title: "Contratos", tabBarIcon: ({ color }) => <Icon glyph="📄" color={color} /> }} />
      <Tabs.Screen name="ofertas" options={{ title: "Ofertas", tabBarIcon: ({ color }) => <Icon glyph="✦" color={color} /> }} />
      <Tabs.Screen name="conta" options={{ title: "Conta", tabBarIcon: ({ color }) => <Icon glyph="◉" color={color} /> }} />
    </Tabs>
  );
}
