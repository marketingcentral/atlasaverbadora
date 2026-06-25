import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useTheme } from "@atlas/ui/native";
import { hasStoredSession } from "../src/lib/sdk";

export default function Index() {
  const theme = useTheme();
  const [target, setTarget] = useState<"login" | "home" | null>(null);

  useEffect(() => {
    let mounted = true;
    void hasStoredSession().then((has) => {
      if (mounted) setTarget(has ? "home" : "login");
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (target === null) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: theme.colors.bg }}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }
  return target === "home" ? <Redirect href="/(tabs)" /> : <Redirect href="/(auth)/login" />;
}
