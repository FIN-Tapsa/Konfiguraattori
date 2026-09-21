// Attribute rules on the rules page: "when a selected item has attribute A = a,
// items with attribute B = b cannot be selected". See domain/attributeRules.ts.

import { useMemo, useState } from "react";
import type { AttributeRule, Item, ProductStructure } from "../../types";
import { collectAttributeKeys } from "../../domain/attributes";
import { blockedItems, hasAttribute, triggerItems } from "../../domain/attributeRules";

interface AttributeRulesSectionProps {
  structure: ProductStructure;
  /** When set, only rules that involve this item (as trigger or blocked) are listed. */
  filterItemId: string | null;
  onAdd: (rule: Omit<AttributeRule, "id">) => void;
  onUpdate: (ruleId: string, changes: Partial<AttributeRule>) => void;
  onDelete: (ruleId: string) => void;
}

const fieldClass =
  "min-w-0 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]";
const pairClass = "grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1.5";

/** Distinct values used with an attribute key across all items, for autocomplete. */
function valuesForKey(structure: ProductStructure, key: string): string[] {
  const k = key.trim().toLowerCase();
  if (!k) return [];
  const values = new Set<string>();
  for (const item of Object.values(structure.items)) {
    for (const a of item.attributes) if (a.key.trim().toLowerCase() === k && a.value) values.add(a.value);
  }
  return [...values].sort((a, b) => a.localeCompare(b, "fi"));
}

function AttributePair({
  structure,
  listId,
  keyValue,
  valueValue,
  onKey,
  onValue,
  keyLabel,
  valueLabel,
}: {
  structure: ProductStructure;
  listId: string;
  keyValue: string;
  valueValue: string;
  onKey: (v: string) => void;
  onValue: (v: string) => void;
  keyLabel: string;
  valueLabel: string;
}) {
  const values = useMemo(() => valuesForKey(structure, keyValue), [structure, keyValue]);
  return (
    <div className={pairClass}>
      <input
        type="text"
        aria-label={keyLabel}
        className={`${fieldClass} font-mono`}
        placeholder="attribuutti"
        list="attr-rule-keys"
        value={keyValue}
        onChange={(e) => onKey(e.target.value)}
      />
      <span className="text-[var(--ink-3)]">=</span>
      <input
        type="text"
        aria-label={valueLabel}
        className={fieldClass}
        placeholder="arvo"
        list={listId}
        value={valueValue}
        onChange={(e) => onValue(e.target.value)}
      />
      <datalist id={listId}>
        {values.map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
    </div>
  );
}

function names(items: Item[]): string {
  if (items.length === 0) return "ei yhtään";
  const shown = items.slice(0, 4).map((i) => i.name || "(nimetön)");
  return `${items.length} kpl (${shown.join(", ")}${items.length > shown.length ? ", …" : ""})`;
}

export function AttributeRulesSection({ structure, filterItemId, onAdd, onUpdate, onDelete }: AttributeRulesSectionProps) {
  const [draft, setDraft] = useState({ whenKey: "", whenValue: "", blockKey: "", blockValue: "", note: "" });
  const keys = collectAttributeKeys(structure);

  const allRules = Object.values(structure.attributeRules ?? {});
  const filterItem = filterItemId ? structure.items[filterItemId] : undefined;
  const rules = filterItem
    ? allRules.filter(
        (r) => hasAttribute(filterItem, r.whenKey, r.whenValue) || hasAttribute(filterItem, r.blockKey, r.blockValue),
      )
    : allRules;

  const canAdd = draft.whenKey.trim() !== "" && draft.blockKey.trim() !== "";
  const handleAdd = () => {
    if (!canAdd) return;
    onAdd({
      whenKey: draft.whenKey.trim(),
      whenValue: draft.whenValue.trim(),
      blockKey: draft.blockKey.trim(),
      blockValue: draft.blockValue.trim(),
      note: draft.note.trim() || undefined,
    });
    setDraft({ whenKey: "", whenValue: "", blockKey: "", blockValue: "", note: "" });
  };

  return (
    <section className="flex flex-col gap-3">
      <datalist id="attr-rule-keys">
        {keys.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <div>
        <h3 className="text-base font-semibold text-[var(--ink)]">Attribuuttisäännöt ({allRules.length})</h3>
        <p className="mt-0.5 text-xs text-[var(--ink-3)]">
          Kun valittuna on nimike, jolla on ehdon attribuutti, kaikki nimikkeet joilla on estettävä attribuutti eivät ole
          valittavissa, ja jo valitut putoavat pois. Ehto voi aina valita. Attribuutit lisätään nimikkeen
          Attribuutit-osiossa (esim. Ajotehtävä-vaihtoehdolle <span className="font-mono">ajotehtävä = cbrn</span>, ei-sopiville
          nimikkeille <span className="font-mono">cbrn = ei</span>). Kirjainkoolla ei ole väliä.
        </p>
      </div>

      <div className="rounded-[14px] border border-[var(--line)] bg-[var(--panel-2)] p-3">
        <p className="mb-2 text-xs text-[var(--ink-2)]">Uusi attribuuttisääntö</p>
        <div className="grid gap-2 md:grid-cols-2">
          <div>
            <label className="mb-0.5 block text-xs text-[var(--ink-2)]">Jos valitulla nimikkeellä on</label>
            <AttributePair
              structure={structure}
              listId="attr-rule-values-new-when"
              keyValue={draft.whenKey}
              valueValue={draft.whenValue}
              onKey={(v) => setDraft((d) => ({ ...d, whenKey: v }))}
              onValue={(v) => setDraft((d) => ({ ...d, whenValue: v }))}
              keyLabel="Ehdon attribuutti"
              valueLabel="Ehdon arvo"
            />
          </div>
          <div>
            <label className="mb-0.5 block text-xs text-[var(--ink-2)]">niin estetään nimikkeet, joilla on</label>
            <AttributePair
              structure={structure}
              listId="attr-rule-values-new-block"
              keyValue={draft.blockKey}
              valueValue={draft.blockValue}
              onKey={(v) => setDraft((d) => ({ ...d, blockKey: v }))}
              onValue={(v) => setDraft((d) => ({ ...d, blockValue: v }))}
              keyLabel="Estettävä attribuutti"
              valueLabel="Estettävä arvo"
            />
          </div>
        </div>
        <input
          type="text"
          className={`${fieldClass} mt-2`}
          placeholder="Selite (näkyy vain editorissa)"
          value={draft.note}
          onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
        />
        <button
          type="button"
          className="mt-2 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--on-accent)] transition hover:opacity-90 disabled:opacity-40"
          disabled={!canAdd}
          onClick={handleAdd}
        >
          + Lisää attribuuttisääntö
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {rules.map((rule) => (
          <li key={rule.id} className="rounded-[14px] border border-[var(--line)] bg-[var(--panel-2)] p-3 text-sm">
            <div className="grid items-start gap-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <div>
                <p className="mb-0.5 text-xs text-[var(--ink-3)]">Jos valitulla nimikkeellä on</p>
                <AttributePair
                  structure={structure}
                  listId={`attr-rule-values-${rule.id}-when`}
                  keyValue={rule.whenKey}
                  valueValue={rule.whenValue}
                  onKey={(v) => onUpdate(rule.id, { whenKey: v })}
                  onValue={(v) => onUpdate(rule.id, { whenValue: v })}
                  keyLabel="Ehdon attribuutti"
                  valueLabel="Ehdon arvo"
                />
              </div>
              <div>
                <p className="mb-0.5 text-xs text-[var(--ink-3)]">niin estetään nimikkeet, joilla on</p>
                <AttributePair
                  structure={structure}
                  listId={`attr-rule-values-${rule.id}-block`}
                  keyValue={rule.blockKey}
                  valueValue={rule.blockValue}
                  onKey={(v) => onUpdate(rule.id, { blockKey: v })}
                  onValue={(v) => onUpdate(rule.id, { blockValue: v })}
                  keyLabel="Estettävä attribuutti"
                  valueLabel="Estettävä arvo"
                />
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-xs text-[var(--warn)] transition hover:bg-[var(--warn-soft)] md:mt-5"
                onClick={() => onDelete(rule.id)}
              >
                Poista
              </button>
            </div>
            <p className="mt-2 text-xs text-[var(--ink-3)]">
              Ehdon täyttävät nimikkeet: {names(triggerItems(structure, rule))} · Estettävät nimikkeet:{" "}
              {names(blockedItems(structure, rule))}
            </p>
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
            {filterItem ? `Nimikkeeseen "${filterItem.name}" ei liity attribuuttisääntöjä.` : "Ei attribuuttisääntöjä vielä."}
          </p>
        )}
      </ul>
    </section>
  );
}
