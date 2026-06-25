import { createContext, useContext, useEffect, useState, type PropsWithChildren } from "react";
import type { ThemeName } from "../tokens/index.js";

type Mode = "system" | "dark" | "light";

interface ThemeCtx {
  mode: Mode;
  resolved: ThemeName;
  setMode: (m: Mode) => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

function resolveSystem(): ThemeName {
  if (typeof window === "undefined" || !window.matchMedia) return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const STORAGE_KEY = "atlas:theme-mode";

export function ThemeProvider({ children, defaultMode = "system" }: PropsWithChildren<{ defaultMode?: Mode }>) {
  const [mode, setMode] = useState<Mode>(() => {
    if (typeof window === "undefined") return defaultMode;
    return (window.localStorage.getItem(STORAGE_KEY) as Mode | null) ?? defaultMode;
  });
  const [resolved, setResolved] = useState<ThemeName>(mode === "system" ? resolveSystem() : mode);

  useEffect(() => {
    const apply = () => setResolved(mode === "system" ? resolveSystem() : mode);
    apply();
    if (mode === "system" && typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    return undefined;
  }, [mode]);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.setAttribute("data-theme", resolved);
  }, [resolved]);

  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, mode);
  }, [mode]);

  return <Ctx.Provider value={{ mode, resolved, setMode }}>{children}</Ctx.Provider>;
}

export function useThemeMode(): ThemeCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("useThemeMode must be inside <ThemeProvider>");
  return v;
}
