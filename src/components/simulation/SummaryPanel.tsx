import type { SimulationDerived } from "../../domain/simulation";

interface SummaryPanelProps {
  derived: SimulationDerived;
  onReset: () => void;
}

export function SummaryPanel({ derived, onReset }: SummaryPanelProps) {
  const { summary, totalPrice, effectiveAttributes, effects } = derived;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Yhteenveto</h2>
        <button
          type="button"
          className="rounded-lg border border-[var(--line-2)] px-2 py-1 text-xs text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]"
          onClick={onReset}
        >
          Nollaa simulaatio
        </button>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {effects.conflicts.length > 0 && (
          <div className="mb-4 rounded-[14px] bg-[var(--warn-soft)] p-3 text-xs text-[var(--warn)]">
            {effects.conflicts.map((c, i) => (
              <p key={i}>⚠ {c}</p>
            ))}
          </div>
        )}

        <h3 className="mb-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">Valittu rakenne</h3>
        <ul className="mb-5 flex flex-col gap-0.5 text-sm">
          {summary.map(({ item, depth }) => (
            <li key={item.id} style={{ paddingLeft: depth * 12 }} className="flex items-center justify-between gap-2 py-0.5 text-[var(--ink)]">
              <span className="min-w-0 truncate">
                {item.type === "assembly" ? "📦" : item.type === "category" ? "📁" : "▫️"} {item.name}
              </span>
              {item.price ? (
                <span className="shrink-0 font-mono text-xs text-[var(--ink-3)]">{item.price.toLocaleString("fi-FI")} €</span>
              ) : null}
            </li>
          ))}
        </ul>

        <h3 className="mb-1.5 font-mono text-xs font-semibold uppercase tracking-wide text-[var(--ink-3)]">Efektiiviset attribuutit</h3>
        <table className="w-full text-sm">
          <tbody>
            {Object.entries(effectiveAttributes).map(([key, value]) => (
              <tr key={key} className="border-b border-[var(--line)] last:border-0">
                <td className="py-1.5 pr-2 font-mono text-xs text-[var(--ink-3)]">{key}</td>
                <td className="py-1.5 text-right font-medium text-[var(--ink)]">{value}</td>
              </tr>
            ))}
            {Object.keys(effectiveAttributes).length === 0 && (
              <tr>
                <td className="py-1 text-[var(--ink-3)]">Ei attribuutteja</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-[var(--line)] bg-[var(--panel-2)] px-4 py-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-[var(--ink)]">Kokonaishinta</span>
          <span className="font-mono text-[26px] font-semibold text-[var(--ink)]">{totalPrice.toLocaleString("fi-FI")} €</span>
        </div>
      </div>
    </div>
  );
}
