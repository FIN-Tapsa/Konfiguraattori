// Dynamic key/value attribute list editor, plus checkboxes for which of an
// item's own attribute keys explicitly override the inherited value from
// its parent path (overridesParentAttributes).

import type { AttributeEntry } from "../../types";

interface AttributesEditorProps {
  attributes: AttributeEntry[];
  overrides: string[];
  onChange: (attributes: AttributeEntry[], overrides: string[]) => void;
}

export function AttributesEditor({ attributes, overrides, onChange }: AttributesEditorProps) {
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

  return (
    <div>
      <div className="mb-1 grid grid-cols-[1fr_1fr_auto_auto] gap-1 text-xs font-medium text-slate-500">
        <span>Nimi</span>
        <span>Arvo</span>
        <span className="text-center" title="Ylikirjoittaa periytyvän arvon">Ylikirj.</span>
        <span />
      </div>
      <div className="flex flex-col gap-1">
        {attributes.map((attr, index) => (
          <div key={index} className="grid grid-cols-[1fr_1fr_auto_auto] items-center gap-1">
            <input
              type="text"
              className="rounded border border-slate-300 px-2 py-1 text-sm"
              placeholder="esim. paino_kg"
              value={attr.key}
              onChange={(e) => updateEntry(index, { key: e.target.value })}
            />
            <input
              type="text"
              className="rounded border border-slate-300 px-2 py-1 text-sm"
              placeholder="esim. 1200"
              value={attr.value}
              onChange={(e) => updateEntry(index, { value: e.target.value })}
            />
            <input
              type="checkbox"
              className="mx-auto"
              checked={attr.key !== "" && overrides.includes(attr.key)}
              disabled={attr.key === ""}
              onChange={() => toggleOverride(attr.key)}
              title="Tämä nimike ylikirjoittaa periytyvän arvon tälle attribuutille"
            />
            <button
              type="button"
              className="rounded px-1 text-xs text-red-600 hover:bg-red-100"
              onClick={() => removeEntry(index)}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        className="mt-2 rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
        onClick={addEntry}
      >
        + Lisää attribuutti
      </button>
    </div>
  );
}
