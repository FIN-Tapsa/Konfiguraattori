import type { SimulationDerived } from "../../domain/simulation";

interface SummaryPanelProps {
  derived: SimulationDerived;
  onReset: () => void;
}

export function SummaryPanel({ derived, onReset }: SummaryPanelProps) {
  const { summary, totalPrice, effectiveAttributes, effects } = derived;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-700">Yhteenveto</h2>
        <button
          type="button"
          className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
          onClick={onReset}
        >
          Nollaa simulaatio
        </button>
      </div>

      <div className="flex-1 overflow-auto p-3">
        {effects.conflicts.length > 0 && (
          <div className="mb-3 rounded bg-red-50 p-2 text-xs text-red-700">
            {effects.conflicts.map((c, i) => (
              <p key={i}>⚠ {c}</p>
            ))}
          </div>
        )}

        <h3 className="mb-1 text-xs font-semibold uppercase text-slate-400">Valittu rakenne</h3>
        <ul className="mb-4 flex flex-col gap-0.5 text-sm">
          {summary.map(({ item, depth }) => (
            <li key={item.id} style={{ paddingLeft: depth * 12 }} className="flex justify-between gap-2">
              <span>{item.type === "assembly" ? "📦" : "▫️"} {item.name}</span>
              {item.price ? <span className="shrink-0 text-slate-400">{item.price.toLocaleString("fi-FI")} €</span> : null}
            </li>
          ))}
        </ul>

        <h3 className="mb-1 text-xs font-semibold uppercase text-slate-400">Efektiiviset attribuutit</h3>
        <table className="mb-4 w-full text-sm">
          <tbody>
            {Object.entries(effectiveAttributes).map(([key, value]) => (
              <tr key={key}>
                <td className="py-0.5 pr-2 text-slate-500">{key}</td>
                <td className="py-0.5 font-medium">{value}</td>
              </tr>
            ))}
            {Object.keys(effectiveAttributes).length === 0 && (
              <tr>
                <td className="text-slate-400">Ei attribuutteja</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="border-t border-slate-200 px-3 py-3">
        <div className="flex items-center justify-between text-lg font-semibold">
          <span>Kokonaishinta</span>
          <span>{totalPrice.toLocaleString("fi-FI")} €</span>
        </div>
      </div>
    </div>
  );
}
