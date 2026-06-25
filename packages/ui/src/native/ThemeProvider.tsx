import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { Appearance } from "react-native";
import { darkTheme, getTheme, lightTheme, type Theme, type ThemeName } from "../tokens/index.js";

type Mode = "system" | "dark" | "light";

interface ThemeCtx {
  mode: Mode;
  resolved: ThemeName;
  theme: Theme;
  setMode: (m: Mode) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

export function ThemeProvider({ children, defaultMode = "system" }: PropsWithChildren<{ defaultMode?: Mode }>) {
  const [mode, setMode] = useState<Mode>(defaultMode);
  const [resolved, setResolved] = useState<ThemeName>(() => {
    if (mode !== "system") return mode;
    return Appearance.getColorScheme() === "light" ? "light" : "dark";
  });

  useEffect(() => {
    if (mode !== "system") {
      setResolved(mode);
      return;
    }
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setResolved(colorScheme === "light" ? "light" : "dark");
    });
    setResolved(Appearance.getColorScheme() === "light" ? "light" : "dark");
    return () => sub.remove();
  }, [mode]);

  const value = useMemo<ThemeCtx>(
    () => ({ mode, resolved, theme: resolved === "dark" ? darkTheme : lightTheme, setMode }),
    [mode, resolved],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useThemeMode(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useThemeMode must be inside <ThemeProvider>");
  return v;
}

export function useTheme(): Theme {
  const v = useContext(Ctx);
  return v?.theme ?? getTheme("dark");
}
