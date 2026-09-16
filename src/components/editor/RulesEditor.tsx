// Editor for cross-tree conditional rules (requires / excludes).

import { useState } from "react";
import type { ConditionalRule, ProductStructure } from "../../types";
import { ItemPicker } from "../ItemPicker";

interface RulesEditorProps {
  structure: ProductStructure;
  onAdd: (rule: Omit<ConditionalRule, "id">) => void;
  onUpdate: (ruleId: string, changes: Partial<ConditionalRule>) => void;
  onDelete: (ruleId: string) => void;
}

export function RulesEditor({ structure, onAdd, onUpdate, onDelete }: RulesEditorProps) {
  const [newSource, setNewSource] = useState<string | null>(null);
  const [newTarget, setNewTarget] = useState<string | null>(null);
  const [newType, setNewType] = useState<ConditionalRule["type"]>("requires");
  const [newNote, setNewNote] = useState("");

  const rules = Object.values(structure.rules);

  const handleAdd = () => {
    if (!newSource || !newTarget) return;
    onAdd({ type: newType, sourceItemId: newSource, targetItemId: newTarget, note: newNote || undefined });
    setNewSource(null);
    setNewTarget(null);
    setNewNote("");
  };

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-slate-700">Säännöt (requires / excludes)</h3>

      <div className="rounded border border-slate-300 p-2">
        <p className="mb-2 text-xs text-slate-500">Uusi sääntö</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex-1">
            <label className="mb-0.5 block text-xs text-slate-500">Lähde (jos valittu...)</label>
            <ItemPicker structure={structure} value={newSource} onChange={setNewSource} />
          </div>
          <select
            className="rounded border border-slate-300 px-2 py-1 text-sm"
            value={newType}
            onChange={(e) => setNewType(e.target.value as ConditionalRule["type"])}
          >
            <option value="requires">vaatii (requires)</option>
            <option value="excludes">poissulkee (excludes)</option>
          </select>
          <div className="flex-1">
            <label className="mb-0.5 block text-xs text-slate-500">Kohde</label>
            <ItemPicker structure={structure} value={newTarget} onChange={setNewTarget} />
          </div>
        </div>
        <input
          type="text"
          className="mt-2 w-full rounded border border-slate-300 px-2 py-1 text-sm"
          placeholder="Selite (näkyy vain editorissa)"
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
        />
        <button
          type="button"
          className="mt-2 rounded bg-sky-600 px-3 py-1 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-40"
          disabled={!newSource || !newTarget}
          onClick={handleAdd}
        >
          + Lisää sääntö
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {rules.map((rule) => (
          <li key={rule.id} className="rounded border border-slate-200 p-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{structure.items[rule.sourceItemId]?.name ?? "(poistettu)"}</span>
              <select
                className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                value={rule.type}
                onChange={(e) => onUpdate(rule.id, { type: e.target.value as ConditionalRule["type"] })}
              >
                <option value="requires">vaatii</option>
                <option value="excludes">poissulkee</option>
              </select>
              <span className="font-medium">{structure.items[rule.targetItemId]?.name ?? "(poistettu)"}</span>
              <button
                type="button"
                className="ml-auto rounded px-2 py-0.5 text-xs text-red-600 hover:bg-red-100"
                onClick={() => onDelete(rule.id)}
              >
                Poista
              </button>
            </div>
            <input
              type="text"
              className="mt-1 w-full rounded border border-slate-200 px-2 py-1 text-xs text-slate-600"
              placeholder="Selite"
              value={rule.note ?? ""}
              onChange={(e) => onUpdate(rule.id, { note: e.target.value })}
            />
          </li>
        ))}
        {rules.length === 0 && <p className="text-sm text-slate-400">Ei sääntöjä vielä.</p>}
      </ul>
    </div>
  );
}
