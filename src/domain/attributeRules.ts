// Attribute-driven rules (see AttributeRule in types): "when a selected item has
// attribute A = a, items with attribute B = b cannot be selected". They are
// expanded into ordinary item-to-item excludes rules for the simulation engine.

import type { AttributeRule, ConditionalRule, Item, ProductStructure } from "../types";

const norm = (s: string) => s.trim().toLowerCase();

export function hasAttribute(item: Item, key: string, value: string): boolean {
  if (!norm(key)) return false;
  return item.attributes.some((a) => norm(a.key) === norm(key) && norm(a.value) === norm(value));
}

export function itemsWithAttribute(structure: ProductStructure, key: string, value: string): Item[] {
  return Object.values(structure.items).filter((item) => hasAttribute(item, key, value));
}

export function triggerItems(structure: ProductStructure, rule: AttributeRule): Item[] {
  return itemsWithAttribute(structure, rule.whenKey, rule.whenValue);
}

/** Items the rule can block; the root is always selected and cannot be toggled. */
export function blockedItems(structure: ProductStructure, rule: AttributeRule): Item[] {
  return itemsWithAttribute(structure, rule.blockKey, rule.blockValue).filter((i) => i.id !== structure.rootItemId);
}

/** A rule as the simulation engine sees it: stored item rules plus derived ones. */
export interface EngineRule extends ConditionalRule {
  /** Human-readable origin, shown in the "cannot be selected because" reason. */
  via?: string;
  /** Excludes that must not be mirrored: the trigger always wins (blocked items drop out). */
  oneWay?: boolean;
}

export function expandAttributeRules(structure: ProductStructure): EngineRule[] {
  const derived: EngineRule[] = [];
  for (const rule of Object.values(structure.attributeRules ?? {})) {
    const triggers = triggerItems(structure, rule);
    if (triggers.length === 0) continue;
    const blocked = blockedItems(structure, rule);
    const via = `attribuuttisääntö: ${rule.whenKey.trim()} = ${rule.whenValue.trim()}`;
    for (const t of triggers) {
      for (const b of blocked) {
        if (t.id === b.id) continue;
        derived.push({ id: `${rule.id}:${t.id}:${b.id}`, type: "excludes", sourceItemId: t.id, targetItemId: b.id, via, oneWay: true });
      }
    }
  }
  return derived;
}
