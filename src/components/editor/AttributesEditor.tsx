// Dynamic key/value attribute list editor, plus checkboxes for which of an
// item's own attribute keys explicitly override the inherited value from
// its parent path (overridesParentAttributes).

import type { AttributeEntry } from "../../types";

interface AttributesEditorProps {
  attributes: AttributeEntry[];
  overrides: string[];
  onChange: (attributes: AttributeEntry[], overrides: string[]) => void;
  /** Structure-wide default value per attribute key. */
  defaults: Record<string, string>;
  /** All attribute keys in use anywhere, offered as suggestions for the key field. */
  keySuggestions: string[];
  /** Makes this value the default for the key everywhere it is used. */
  onSetDefault: (key: string, value: string) => void;
}

export function AttributesEditor({ attributes, overrides, onChange, defaults, keySuggestions, onSetDefault }: AttributesEditorProps) {
  const updateEntry = (index: number, changes: Partial<AttributeEntry>) => {
    const next = attributes.map((a, i) => (i === index ? { ...a, ...changes } : a));
    onChange(next, overrides);
  };

  const removeEntry = (index: number) => {
    const removedKey = attributes[index]?.key;
    const next = attributes.filter((_, i) => i !== index);
    onChange(
      next,
      overrides.filter((k) => k !== removedKey)
    );
  };

  const addEntry = () => {
    onChange([...attributes, { key: "", value: "" }], overrides);
  };

  const toggleOverride = (key: string) => {
    const next = overrides.includes(key) ? overrides.filter((k) => k !== key) : [...overrides, key];
    onChange(attributes, next);
  };

  // Picking an existing global attribute by name pre-fills its default value.
  const fillDefault = (index: number) => {
    const attr = attributes[index];
    const def = attr && defaults[attr.key];
    if (def !== undefined && attr.value === "") updateEntry(index, { value: def });
  };

  return (
    <div className="overflow-hidden rounded-[12px] border border-[var(--line)]">
      <datalist id="attribute-key-suggestions">
        {keySuggestions.map((k) => (
          <option key={k} value={k} />
        ))}
      </datalist>
      <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-1 bg-[var(--panel)] max-[700px]:hidden px-2 py-1.5 text-xs font-medium text-[var(--ink-3)]">
        <span>Nimi</span>
        <span>Arvo</span>
        <span className="text-center">Alkuperä</span>
        <span className="text-center">Oletus</span>
        <span />
      </div>
      <div className="flex flex-col divide-y divide-[var(--line)] bg-[var(--panel-2)]">
        {attributes.map((attr, index) => {
          const isOverride = attr.key !== "" && overrides.includes(attr.key);
          return (
            <div key={index} className="grid grid-cols-[1fr_1fr_auto_auto_auto] items-center gap-1 px-2 py-1.5 max-[700px]:flex max-[700px]:flex-wrap max-[700px]:gap-1.5">
              <input
                type="text"
                className="min-w-0 rounded-md border border-transparent bg-transparent px-1 py-0.5 max-[700px]:min-w-[40%] max-[700px]:flex-1 max-[700px]:border-[var(--line)] font-mono text-xs text-[var(--ink)] outline-none transition hover:border-[var(--line)] focus:border-[var(--accent)] focus:bg-[var(--panel)]"
                placeholder="esim. paino_kg"
                list="attribute-key-suggestions"
                value={attr.key}
                onChange={(e) => updateEntry(index, { key: e.target.value })}
                onBlur={() => fillDefault(index)}
              />
              <input
                type="text"
                className="min-w-0 rounded-md border border-transparent bg-transparent px-1 py-0.5 max-[700px]:min-w-[40%] max-[700px]:flex-1 max-[700px]:border-[var(--line)] text-sm text-[var(--ink)] outline-none transition hover:border-[var(--line)] focus:border-[var(--accent)] focus:bg-[var(--panel)]"
                placeholder="esim. 1200"
                value={attr.value}
                onChange={(e) => updateEntry(index, { value: e.target.value })}
              />
              <button
                type="button"
                disabled={attr.key === ""}
                onClick={() => toggleOverride(attr.key)}
                title="Tämä nimike ylikirjoittaa periytyvän arvon tälle attribuutille"
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium transition disabled:opacity-40 ${
                  isOverride
                    ? "bg-[var(--accent-soft)] text-[var(--ink)] outline outline-1 outline-[var(--accent-line)]"
                    : "bg-[var(--panel)] text-[var(--ink-3)]"
                }`}
              >
                {isOverride ? "ylikirjoittaa" : "periytyy"}
              </button>
              {(() => {
                const def = attr.key ? defaults[attr.key] : undefined;
                if (attr.key === "" || attr.value === "") return <span />;
                if (def === attr.value) {
                  return <span className="px-1 text-[10px] text-[var(--ink-3)]" title="Arvo on globaali oletusarvo">oletus</span>;
                }
                return (
                  <button
                    type="button"
                    onClick={() => onSetDefault(attr.key, attr.value)}
                    title={
                      def === undefined
                        ? "Aseta tämä arvo oletusarvoksi kaikkialle, missä attribuuttia käytetään (tyhjät ja oletusta seuraavat arvot päivittyvät)"
                        : `Korvaa globaali oletusarvo (${def}) tällä arvolla kaikkialla, missä se on käytössä`
                    }
                    className="shrink-0 rounded-full bg-[var(--panel)] px-2 py-0.5 text-[10px] font-medium text-[var(--ink-2)] transition hover:bg-[var(--accent-soft)]"
                  >
                    ⇉ oletukseksi
                  </button>
                );
              })()}
              <button
                type="button"
                className="rounded px-1 text-xs text-[var(--warn)] transition hover:bg-[var(--warn-soft)]"
                onClick={() => removeEntry(index)}
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>
      <button
        type="button"
        className="w-full border-t border-[var(--line)] bg-[var(--panel)] px-2 py-1.5 text-left text-xs text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]"
        onClick={addEntry}
      >
        + Attribuutti
      </button>
    </div>
  );
}
