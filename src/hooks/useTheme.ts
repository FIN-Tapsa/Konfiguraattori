// Theme state: defaults to the OS/browser preference (live-updating via the
// prefers-color-scheme media query in index.css) until the user explicitly
// toggles it, at which point the choice is pinned via [data-theme] and
// remembered in localStorage.

import { useCallback, useEffect, useState } from "react";

type ThemeChoice = "system" | "light" | "dark";
const STORAGE_KEY = "konfiguraattori-theme";

function readStoredChoice(): ThemeChoice {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // localStorage unavailable (private mode etc.) - fall back to system.
  }
  return "system";
}

function readSystemPrefersDark(): boolean {
  return typeof window !== "undefined" && window.matchMedia?.("(prefers-color-scheme: dark)").matches === true;
}

export function useTheme() {
  const [choice, setChoice] = useState<ThemeChoice>(() => readStoredChoice());
  const [systemIsDark, setSystemIsDark] = useState(() => readSystemPrefersDark());

  useEffect(() => {
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemIsDark(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (choice === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", choice);
    }
    try {
      if (choice === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, choice);
    } catch {
      // ignore
    }
  }, [choice]);

  const resolved: "light" | "dark" = choice === "system" ? (systemIsDark ? "dark" : "light") : choice;

  const toggleTheme = useCallback(() => {
    setChoice(resolved === "dark" ? "light" : "dark");
  }, [resolved]);

  return { resolved, toggleTheme };
}
