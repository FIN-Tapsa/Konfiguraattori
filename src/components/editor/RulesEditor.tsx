// Editor for cross-tree conditional rules (requires / excludes).

import { useState } from "react";
import type { ConditionalRule, ProductStructure } from "../../types";
import { ItemPicker } from "../ItemPicker";

interface RulesEditorProps {
  structure: ProductStructure;
  onAdd: (rule: Omit<ConditionalRule, "id">) => void;
  onUpdate: (ruleId: string, changes: Partial<ConditionalRule>) => void;
  onDelete: (ruleId: string) => void;
  /** When a rule involves this item, a small "lähteenä"/"kohteena" badge is shown on its card. */
  focusItemId?: string;
}

const TYPE_LABELS: Record<ConditionalRule["type"], string> = {
  requires: "vaatii",
  excludes: "poissulkee",
};

export function RulesEditor({ structure, onAdd, onUpdate, onDelete, focusItemId }: RulesEditorProps) {
  const [newSource, setNewSource] = useState<string | null>(null);
  const [newTarget, setNewTarget] = useState<string | null>(null);
  const [newType, setNewType] = useState<ConditionalRule["type"]>("requires");
  const [newNote, setNewNote] = useState("");

  const rules = Object.values(structure.rules);
  const fieldClass =
    "w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]";

  const handleAdd = () => {
    if (!newSource || !newTarget) return;
    onAdd({ type: newType, sourceItemId: newSource, targetItemId: newTarget, note: newNote || undefined });
    setNewSource(null);
    setNewTarget(null);
    setNewNote("");
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-[var(--ink)]">Säännöt</h3>

      <div className="rounded-[14px] border border-[var(--line)] bg-[var(--panel-2)] p-3">
        <p className="mb-2 text-xs text-[var(--ink-2)]">Uusi sääntö</p>
        <div className="flex flex-col gap-2">
          <div>
            <label className="mb-0.5 block text-xs text-[var(--ink-2)]">Lähde (jos valittu...)</label>
            <ItemPicker structure={structure} value={newSource} onChange={setNewSource} />
          </div>
          <select
            className={fieldClass}
            value={newType}
            onChange={(e) => setNewType(e.target.value as ConditionalRule["type"])}
          >
            <option value="requires">vaatii (requires)</option>
            <option value="excludes">poissulkee (excludes)</option>
          </select>
          <div>
            <label className="mb-0.5 block text-xs text-[var(--ink-2)]">Kohde</label>
            <ItemPicker structure={structure} value={newTarget} onChange={setNewTarget} />
          </div>
        </div>
        <input
          type="text"
          className={`${fieldClass} mt-2`}
          placeholder="Selite (näkyy vain editorissa)"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <button
          type="button"
          className="mt-2 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--on-accent)] transition hover:opacity-90 disabled:opacity-40"
          disabled={!newSource || !newTarget}
          onClick={handleAdd}
        >
          + Lisää sääntö
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {rules.map((rule) => {
          const direction = rule.sourceItemId === focusItemId ? "lähteenä" : rule.targetItemId === focusItemId ? "kohteena" : null;
          return (
            <li key={rule.id} className="rounded-[14px] border border-[var(--line)] bg-[var(--panel-2)] p-3 text-sm">
              <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
                    rule.type === "requires"
                      ? "bg-[var(--accent-soft)] text-[var(--ink)] outline outline-1 outline-[var(--accent-line)]"
                      : "bg-[var(--warn-soft)] text-[var(--warn)]"
                  }`}
                >
                  {TYPE_LABELS[rule.type]}
                </span>
                {direction && (
                  <span className="rounded-full bg-[var(--panel)] px-2 py-0.5 text-[10px] text-[var(--ink-3)]">
                    valittu nimike {direction}
                  </span>
                )}
                <button
                  type="button"
                  className="ml-auto shrink-0 rounded-md px-2 py-0.5 text-xs text-[var(--warn)] transition hover:bg-[var(--warn-soft)]"
                  onClick={() => onDelete(rule.id)}
                >
                  Poista
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 font-medium text-[var(--ink)]">
                <span className="truncate">{structure.items[rule.sourceItemId]?.name ?? "(poistettu)"}</span>
                <span className="text-[var(--ink-3)]">→</span>
                <span className="truncate">{structure.items[rule.targetItemId]?.name ?? "(poistettu)"}</span>
              </div>
              <input
                type="text"
                className="mt-1.5 w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-xs text-[var(--ink-2)] outline-none transition hover:border-[var(--line)] focus:border-[var(--accent)] focus:bg-[var(--panel)]"
                placeholder="Selite"
                value={rule.note ?? ""}
                onChange={(e) => onUpdate(rule.id, { note: e.target.value })}
              />
            </li>
          );
        })}
        {rules.length === 0 && <p className="text-sm text-[var(--ink-3)]">Ei sääntöjä vielä.</p>}
      </ul>
    </div>
  );
}
