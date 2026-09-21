// Compact rules overview for the editor's right column. Editing lives on the
// full RulesPage; this only lists the rules touching the selected item.

import type { ConditionalRule, ProductStructure } from "../../types";

interface RulesSummaryProps {
  structure: ProductStructure;
  selectedItemId: string;
  onOpenRules: () => void;
}

const VERB: Record<ConditionalRule["type"], string> = { requires: "vaatii", excludes: "poissulkee" };

export function RulesSummary({ structure, selectedItemId, onOpenRules }: RulesSummaryProps) {
  const all = Object.values(structure.rules);
  const isRoot = selectedItemId === structure.rootItemId;
  const related = all.filter((r) => r.sourceItemId === selectedItemId || r.targetItemId === selectedItemId);
  const name = (id: string) => structure.items[id]?.name ?? "(poistettu)";

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-[var(--ink)]">Säännöt</h3>
        <button
          type="button"
          className="rounded-lg bg-[var(--accent-soft)] px-2.5 py-1 text-xs font-medium text-[var(--ink)] transition hover:opacity-90"
          onClick={onOpenRules}
        >
          Avaa sääntösivu
        </button>
      </div>
      {isRoot ? (
        <p className="text-xs text-[var(--ink-3)]">{all.length} sääntöä rakenteessa. Valitse nimike nähdäksesi sen säännöt.</p>
      ) : related.length === 0 ? (
        <p className="text-xs text-[var(--ink-3)]">Valittuun nimikkeeseen ei liity sääntöjä.</p>
      ) : (
        <ul className="flex flex-col gap-1 text-xs text-[var(--ink-2)]">
          {related.map((r) => (
            <li key={r.id} className="rounded-lg bg-[var(--panel-2)] px-2 py-1.5">
              <span className="font-medium text-[var(--ink)]">{name(r.sourceItemId)}</span> {VERB[r.type]}{" "}
              <span className="font-medium text-[var(--ink)]">{name(r.targetItemId)}</span>
              {r.type === "excludes" && <span className="text-[var(--ink-3)]"> (molempiin suuntiin)</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
