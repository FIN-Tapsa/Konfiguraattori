// Global attribute defaults: an attribute key can have one default value for
// the whole structure. Setting it fills in every item that uses the key and
// still follows the default (empty value or the previous default), while
// values that were deliberately set differently are left alone.

import type { ProductStructure } from "../types";

/** Every attribute key in use by some item or having a default, sorted. */
export function collectAttributeKeys(structure: ProductStructure): string[] {
  const keys = new Set<string>(Object.keys(structure.attributeDefaults ?? {}));
  for (const item of Object.values(structure.items)) {
    for (const attr of item.attributes) if (attr.key) keys.add(attr.key);
  }
  return [...keys].sort((a, b) => a.localeCompare(b, "fi"));
}

export function countAttributeUsage(structure: ProductStructure, key: string): number {
  return Object.values(structure.items).filter((item) => item.attributes.some((a) => a.key === key)).length;
}

/** Sets (or, with an empty value, removes) a key's default and propagates it to items still following it. */
export function setAttributeDefault(structure: ProductStructure, key: string, value: string): ProductStructure {
  if (!key) return structure;
  const previous = structure.attributeDefaults?.[key];
  const attributeDefaults = { ...structure.attributeDefaults };
  if (value === "") delete attributeDefaults[key];
  else attributeDefaults[key] = value;

  let items = structure.items;
  if (value !== "") {
    items = { ...structure.items };
    for (const item of Object.values(structure.items)) {
      const follows = (v: string) => v === "" || v === previous;
      if (!item.attributes.some((a) => a.key === key && follows(a.value))) continue;
      items[item.id] = {
        ...item,
        attributes: item.attributes.map((a) => (a.key === key && follows(a.value) ? { ...a, value } : a)),
      };
    }
  }
  return { ...structure, attributeDefaults, items, updatedAt: Date.now() };
}
