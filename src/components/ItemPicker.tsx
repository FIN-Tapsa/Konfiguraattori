// Search/select control for picking any item in the tree by name or code.
// Used by the rule editor, since rules can reference any node in the tree
// (not just siblings), so a plain <select> of children is not enough.

import { useMemo, useState } from "react";
import type { ProductStructure } from "../types";

interface ItemPickerProps {
  structure: ProductStructure;
  value: string | null;
  onChange: (itemId: string) => void;
  excludeItemIds?: string[];
  placeholder?: string;
}

export function ItemPicker({ structure, value, onChange, excludeItemIds = [], placeholder }: ItemPickerProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const results = useMemo(() => {
    const excluded = new Set(excludeItemIds);
    const items = Object.values(structure.items).filter((i) => !excluded.has(i.id));
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter((i) => i.name.toLowerCase().includes(q) || (i.code ?? "").toLowerCase().includes(q))
      : items;
    return filtered.slice(0, 30);
  }, [structure.items, query, excludeItemIds]);

  const selectedItem = value ? structure.items[value] : undefined;

  return (
    <div className="relative">
      <input
        type="text"
        className="w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
        placeholder={placeholder ?? "Hae nimikettä nimellä tai koodilla..."}
        value={open ? query : selectedItem?.name ?? query}
        onFocus={() => {
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      />
      {open && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-[14px] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow)]">
          {results.length === 0 && <li className="px-2 py-1.5 text-sm text-[var(--ink-3)]">Ei tuloksia</li>}
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className="block w-full px-2 py-1.5 text-left text-sm text-[var(--ink)] transition hover:bg-[var(--accent-soft)]"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onChange(item.id);
                  setQuery("");
                  setOpen(false);
                }}
              >
                {item.name}
                {item.code ? <span className="ml-1 font-mono text-xs text-[var(--ink-3)]">({item.code})</span> : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
