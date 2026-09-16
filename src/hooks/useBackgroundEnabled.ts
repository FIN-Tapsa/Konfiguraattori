// Boolean setting for the animated backdrop (see AnimatedBackground.tsx),
// remembered per-browser so it can be switched off (perf/preference/reduced
// motion) without touching the theme.

import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "konfiguraattori-bg-enabled";

function readStored(): boolean {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value !== null) return value === "1";
  } catch {
    // ignore
  }
  return true;
}

export function useBackgroundEnabled() {
  const [enabled, setEnabled] = useState<boolean>(() => readStored());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {
      // ignore
    }
  }, [enabled]);

  const toggle = useCallback(() => setEnabled((v) => !v), []);

  return { enabled, toggle };
}
