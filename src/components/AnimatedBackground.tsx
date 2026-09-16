// Three large, slowly-drifting blurred colour fields behind the floating
// cards. Purely decorative - respects prefers-reduced-motion (see the
// .bg-orb-* animations in index.css) and can be switched off entirely via
// the boolean `enabled` prop (see useBackgroundEnabled).
//
// Opacity comes from the --orb-op-* CSS tokens (index.css) rather than a
// Tailwind dark: variant, since those tokens already flip per-theme
// consistently with the rest of the app's [data-theme] setup.

export function AnimatedBackground({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden [backdrop-filter:blur(40px)]" aria-hidden="true">
      <div
        className="bg-orb-a absolute -left-[10vw] -top-[14vw] h-[58vw] w-[58vw] rounded-full blur-[90px]"
        style={{ background: "oklch(0.6 0.16 250)", opacity: "var(--orb-op-a)" }}
      />
      <div
        className="bg-orb-b absolute -right-[12vw] -top-[10vw] h-[52vw] w-[52vw] rounded-full blur-[90px]"
        style={{ background: "oklch(0.72 0.14 205)", opacity: "var(--orb-op-b)" }}
      />
      <div
        className="bg-orb-c absolute -bottom-[16vw] left-[18vw] h-[46vw] w-[46vw] rounded-full blur-[90px]"
        style={{ background: "oklch(0.8 0.17 120)", opacity: "var(--orb-op-c)" }}
      />
    </div>
  );
}
