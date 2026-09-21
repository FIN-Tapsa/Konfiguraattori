// Structure-wide attribute defaults. One default per attribute key; changing it
// updates every item that uses the key and still follows the default.

import type { ProductStructure } from "../../types";
import { collectAttributeKeys, countAttributeUsage } from "../../domain/attributes";

interface GlobalAttributesPanelProps {
  structure: ProductStructure;
  onSetDefault: (key: string, value: string) => void;
}

export function GlobalAttributesPanel({ structure, onSetDefault }: GlobalAttributesPanelProps) {
  const keys = collectAttributeKeys(structure);

  return (
    <details open={keys.length <= 8}>
      <summary className="cursor-pointer text-sm font-semibold text-[var(--ink)]">Globaalit attribuutit ({keys.length})</summary>
      <p className="mb-2 mt-1 text-xs text-[var(--ink-3)]">
        Oletusarvo täyttyy automaattisesti kaikkiin nimikkeisiin, joilla attribuutti on käytössä ja arvo on tyhjä tai
        seuraa oletusta. Erikseen asetetut arvot säilyvät.
      </p>
      {keys.length === 0 ? (
        <p className="text-xs text-[var(--ink-3)]">Ei attribuutteja vielä. Lisää niitä nimikkeen Attribuutit-osiossa.</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {keys.map((key) => (
            <li key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-center gap-2">
              <span className="min-w-0 truncate font-mono text-xs text-[var(--ink)]" title={key}>
                {key} <span className="text-[var(--ink-3)]">({countAttributeUsage(structure, key)})</span>
              </span>
              <input
                type="text"
                aria-label={`Oletusarvo: ${key}`}
                className="min-w-0 rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-1.5 py-0.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                placeholder="ei oletusarvoa"
                value={structure.attributeDefaults?.[key] ?? ""}
                onChange={(e) => onSetDefault(key, e.target.value)}
              />
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
