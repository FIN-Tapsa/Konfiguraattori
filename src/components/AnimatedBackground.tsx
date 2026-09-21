// Four large, slowly-drifting soft colour fields behind the floating cards,
// one per corner so the whole viewport is covered whatever its shape. Purely
// decorative - drifts more slowly under prefers-reduced-motion (see the
// .bg-orb-* animations in index.css) and can be switched off entirely via
// the boolean `enabled` prop (see useBackgroundEnabled).
//
// The softness comes from radial gradients that fade to transparent, not from
// a CSS blur() filter: huge blurred layers are expensive and can fail to
// render (leaving a flat grey page) on weaker GPUs/browsers, and a transform
// animation on a gradient is cheap everywhere.
//
// Opacity comes from the --orb-op-* CSS tokens (index.css) rather than a
// Tailwind dark: variant, since those tokens already flip per-theme
// consistently with the rest of the app's [data-theme] setup.

const orb = (color: string) => `radial-gradient(closest-side, ${color}, transparent)`;

export function AnimatedBackground({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      <div
        className="bg-orb bg-orb-a -left-[26vmax] -top-[30vmax] h-[80vmax] w-[80vmax]"
        style={{ background: orb("oklch(0.6 0.16 250)"), opacity: "var(--orb-op-a)" }}
      />
      <div
        className="bg-orb bg-orb-b -right-[24vmax] -top-[28vmax] h-[74vmax] w-[74vmax]"
        style={{ background: orb("oklch(0.72 0.14 205)"), opacity: "var(--orb-op-b)" }}
      />
      <div
        className="bg-orb bg-orb-c -bottom-[30vmax] -left-[20vmax] h-[72vmax] w-[72vmax]"
        style={{ background: orb("oklch(0.8 0.17 120)"), opacity: "var(--orb-op-c)" }}
      />
      <div
        className="bg-orb bg-orb-d -bottom-[28vmax] -right-[22vmax] h-[68vmax] w-[68vmax]"
        style={{ background: orb("oklch(0.7 0.13 230)"), opacity: "var(--orb-op-d)" }}
      />
    </div>
  );
}
