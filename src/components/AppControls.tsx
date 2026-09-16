// Small header control cluster: theme toggle + animated-background toggle.
// Shared across every screen's header card.

import { useTheme } from "../hooks/useTheme";
import { useBackgroundEnabled } from "../hooks/useBackgroundEnabled";

export function AppControls() {
  const { resolved, toggleTheme } = useTheme();
  const { enabled, toggle } = useBackgroundEnabled();

  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={toggle}
        title={enabled ? "Sammuta animoitu tausta" : "Näytä animoitu tausta"}
        aria-pressed={enabled}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink-2)] transition hover:border-[var(--line-2)] hover:text-[var(--ink)]"
      >
        {enabled ? "◐" : "○"}
      </button>
      <button
        type="button"
        onClick={toggleTheme}
        title={resolved === "dark" ? "Vaihda vaaleaan teemaan" : "Vaihda tummaan teemaan"}
        aria-pressed={resolved === "dark"}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--line)] text-[var(--ink-2)] transition hover:border-[var(--line-2)] hover:text-[var(--ink)]"
      >
        {resolved === "dark" ? "☾" : "☀"}
      </button>
    </div>
  );
}
