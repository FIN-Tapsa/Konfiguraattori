// Full-page editor for cross-tree conditional rules (requires / excludes).
// Opened from the header; filtered to one item when the editor had one selected.

import { useState } from "react";
import type { ConditionalRule, ProductStructure } from "../../types";
import { ItemPicker } from "../ItemPicker";

interface RulesPageProps {
  structure: ProductStructure;
  /** Item selected in the editor; rules are filtered to it (root = no filter). */
  initialFilterItemId: string | null;
  onAdd: (rule: Omit<ConditionalRule, "id">) => void;
  onUpdate: (ruleId: string, changes: Partial<ConditionalRule>) => void;
  onDelete: (ruleId: string) => void;
  onBack: () => void;
}

// Excludes works both ways (see withMirroredExcludes in domain/simulation.ts).
const TYPE_LABELS: Record<ConditionalRule["type"], string> = {
  requires: "vaatii →",
  excludes: "poissulkee ⇄",
};

const fieldClass =
  "w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]";
const rowClass = "grid items-center gap-2 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto]";

function TypeSelect({
  value,
  onChange,
}: {
  value: ConditionalRule["type"];
  onChange: (type: ConditionalRule["type"]) => void;
}) {
  return (
    <select
      aria-label="Säännön tyyppi"
      value={value}
      onChange={(e) => onChange(e.target.value as ConditionalRule["type"])}
      className={`rounded-full px-3 py-1.5 text-xs font-medium outline-none ${
        value === "requires"
          ? "bg-[var(--accent-soft)] text-[var(--ink)] outline outline-1 outline-[var(--accent-line)]"
          : "bg-[var(--warn-soft)] text-[var(--warn)]"
      }`}
    >
      <option value="requires">{TYPE_LABELS.requires}</option>
      <option value="excludes">{TYPE_LABELS.excludes}</option>
    </select>
  );
}

export function RulesPage({ structure, initialFilterItemId, onAdd, onUpdate, onDelete, onBack }: RulesPageProps) {
  const [filterItemId, setFilterItemId] = useState<string | null>(
    initialFilterItemId && initialFilterItemId !== structure.rootItemId ? initialFilterItemId : null,
  );
  const [newSource, setNewSource] = useState<string | null>(null);
  const [newTarget, setNewTarget] = useState<string | null>(null);
  const [newType, setNewType] = useState<ConditionalRule["type"]>("requires");
  const [newNote, setNewNote] = useState("");

  const allRules = Object.values(structure.rules);
  const rules = filterItemId
    ? allRules.filter((r) => r.sourceItemId === filterItemId || r.targetItemId === filterItemId)
    : allRules;
  const filterItem = filterItemId ? structure.items[filterItemId] : undefined;

  const startNewRule = () => {
    // With a filter active, prefill the source so the new rule shows up in the filtered list.
    if (filterItemId && !newSource) setNewSource(filterItemId);
  };

  const handleAdd = () => {
    if (!newSource || !newTarget) return;
    onAdd({ type: newType, sourceItemId: newSource, targetItemId: newTarget, note: newNote || undefined });
    setNewSource(filterItemId);
    setNewTarget(null);
    setNewNote("");
  };

  return (
    <div className="min-h-0 flex-1 overflow-auto p-[18px]">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow)]">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            className="shrink-0 text-sm text-[var(--ink-2)] transition hover:text-[var(--ink)]"
            onClick={onBack}
          >
            ← Takaisin editoriin
          </button>
          <h2 className="text-lg font-semibold text-[var(--ink)]">Säännöt</h2>
          <span className="text-xs text-[var(--ink-3)]">
            {filterItemId ? `${rules.length} / ${allRules.length}` : allRules.length}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-[14px] bg-[var(--panel-2)] p-3">
          <span className="text-xs text-[var(--ink-2)]">Suodata nimikkeellä:</span>
          <div className="min-w-[200px] flex-1">
            <ItemPicker
              structure={structure}
              value={filterItemId}
              onChange={setFilterItemId}
              placeholder="Kaikki säännöt - hae nimikettä..."
            />
          </div>
          {filterItemId && (
            <button
              type="button"
              className="shrink-0 rounded-lg px-3 py-1.5 text-xs text-[var(--ink-2)] transition hover:bg-[var(--panel)] hover:text-[var(--ink)]"
              onClick={() => {
                setFilterItemId(null);
                setNewSource(null);
              }}
            >
              Näytä kaikki
            </button>
          )}
        </div>

        <div className="rounded-[14px] border border-[var(--line)] bg-[var(--panel-2)] p-3" onFocusCapture={startNewRule}>
          <p className="mb-2 text-xs text-[var(--ink-2)]">Uusi sääntö (jos lähde on valittu, niin kohde ...)</p>
          <div className={rowClass}>
            <ItemPicker structure={structure} value={newSource} onChange={setNewSource} excludeItemIds={newTarget ? [newTarget] : []} placeholder="Lähde..." />
            <TypeSelect value={newType} onChange={setNewType} />
            <ItemPicker structure={structure} value={newTarget} onChange={setNewTarget} excludeItemIds={newSource ? [newSource] : []} placeholder="Kohde..." />
            <button
              type="button"
              className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--on-accent)] transition hover:opacity-90 disabled:opacity-40"
              disabled={!newSource || !newTarget}
              onClick={handleAdd}
            >
              + Lisää
            </button>
          </div>
          <input
            type="text"
            className={`${fieldClass} mt-2`}
            placeholder="Selite (näkyy vain editorissa)"
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
          />
        </div>

        <ul className="flex flex-col gap-2">
          {rules.map((rule) => (
            <li key={rule.id} className="rounded-[14px] border border-[var(--line)] bg-[var(--panel-2)] p-3 text-sm">
              <div className={rowClass}>
                <ItemPicker
                  structure={structure}
                  value={rule.sourceItemId}
                  onChange={(id) => onUpdate(rule.id, { sourceItemId: id })}
                  excludeItemIds={[rule.targetItemId]}
                  placeholder="(poistettu) - valitse lähde"
                />
                <TypeSelect value={rule.type} onChange={(type) => onUpdate(rule.id, { type })} />
                <ItemPicker
                  structure={structure}
                  value={rule.targetItemId}
                  onChange={(id) => onUpdate(rule.id, { targetItemId: id })}
                  excludeItemIds={[rule.sourceItemId]}
                  placeholder="(poistettu) - valitse kohde"
                />
                <button
                  type="button"
                  className="rounded-md px-2 py-1 text-xs text-[var(--warn)] transition hover:bg-[var(--warn-soft)]"
                  onClick={() => onDelete(rule.id)}
                >
                  Poista
                </button>
              </div>
              <input
                type="text"
                className="mt-1.5 w-full rounded-md border border-transparent bg-transparent px-1 py-0.5 text-xs text-[var(--ink-2)] outline-none transition hover:border-[var(--line)] focus:border-[var(--accent)] focus:bg-[var(--panel)]"
                placeholder="Selite"
                value={rule.note ?? ""}
                onChange={(e) => onUpdate(rule.id, { note: e.target.value })}
              />
            </li>
          ))}
          {rules.length === 0 && (
            <p className="text-sm text-[var(--ink-3)]">
              {filterItem ? `Nimikkeeseen "${filterItem.name}" ei liity sääntöjä.` : "Ei sääntöjä vielä."}
            </p>
          )}
        </ul>
      </div>
    </div>
  );
}
