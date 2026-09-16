// Pure, immutable tree utilities operating on a ProductStructure.
// Every function returns a new ProductStructure rather than mutating the input.

import { v4 as uuid } from "uuid";
import type { Item, ProductStructure } from "../types";

// Default väliotsikko ("category") headings every new blank structure starts
// with, matching the typical section breakdown of a heavy vehicle's product
// structure. Purely a convenience starting point - freely rename/reorder/
// delete them like any other item.
const DEFAULT_CATEGORY_NAMES = [
  "Alusta ja varusteet",
  "Moottori ja vaihteisto",
  "Etuakseli ja ohjaus",
  "Taka-akseli",
  "Polttoainesäiliö",
  "Paineilmajärjestelmä",
  "Alustan sähkölaitteet ja valot",
  "Ohjaamon sähkölaitteet",
  "Viestintälaitteet",
  "Ohjaamon perusvarusteet",
  "Ohjaamon suojavarusteet",
  "Ohjaamon sisustus",
  "Ohjaamon kattovarustus",
  "Ohjaamon ja alustan maalaus",
  "Perävaunun veto ja liitäntä",
  "Rengasvarusteet",
  "Ensiapuvälineet",
  "Varusteet",
  "Renkaat",
];

export function createEmptyStructure(name: string): ProductStructure {
  const rootId = uuid();
  const categories: Item[] = DEFAULT_CATEGORY_NAMES.map((categoryName) => ({
    id: uuid(),
    name: categoryName,
    type: "category",
    attributes: [],
    overridesParentAttributes: [],
    children: [],
  }));
  const root: Item = {
    id: rootId,
    name,
    type: "assembly",
    pricingMode: "sumOfChildren",
    attributes: [],
    overridesParentAttributes: [],
    children: categories.map((c) => c.id),
  };
  const items: Record<string, Item> = { [rootId]: root };
  for (const category of categories) items[category.id] = category;

  return {
    id: uuid(),
    name,
    rootItemId: rootId,
    items,
    groups: {},
    rules: {},
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function getItem(structure: ProductStructure, itemId: string): Item | undefined {
  return structure.items[itemId];
}

export function getParentId(structure: ProductStructure, itemId: string): string | undefined {
  for (const item of Object.values(structure.items)) {
    if (item.children.includes(itemId)) return item.id;
  }
  return undefined;
}

/** Returns true if `candidateAncestorId` is itemId itself or an ancestor of it. */
export function isSelfOrAncestor(
  structure: ProductStructure,
  candidateAncestorId: string,
  itemId: string
): boolean {
  let current: string | undefined = itemId;
  const seen = new Set<string>();
  while (current) {
    if (current === candidateAncestorId) return true;
    if (seen.has(current)) return false; // corrupt/cyclic, bail out
    seen.add(current);
    current = getParentId(structure, current);
  }
  return false;
}

export function addItem(
  structure: ProductStructure,
  parentId: string,
  partial: Partial<Item> & { name: string; type: Item["type"] }
): { structure: ProductStructure; itemId: string } {
  const id = uuid();
  const item: Item = {
    id,
    name: partial.name,
    type: partial.type,
    code: partial.code,
    description: partial.description,
    price: partial.price,
    pricingMode: partial.type === "assembly" ? partial.pricingMode ?? "sumOfChildren" : undefined,
    color: partial.color,
    imageUrl: partial.imageUrl,
    attributes: partial.attributes ?? [],
    overridesParentAttributes: partial.overridesParentAttributes ?? [],
    children: partial.type === "assembly" ? [] : [],
    required: partial.required ?? false,
  };
  const parent = structure.items[parentId];
  if (!parent) throw new Error(`Parent item ${parentId} not found`);
  const newParent: Item = { ...parent, children: [...parent.children, id] };
  return {
    structure: {
      ...structure,
      items: { ...structure.items, [id]: item, [parentId]: newParent },
      updatedAt: Date.now(),
    },
    itemId: id,
  };
}

export function updateItem(
  structure: ProductStructure,
  itemId: string,
  changes: Partial<Item>
): ProductStructure {
  const existing = structure.items[itemId];
  if (!existing) throw new Error(`Item ${itemId} not found`);
  const updated: Item = { ...existing, ...changes, id: itemId };
  return {
    ...structure,
    items: { ...structure.items, [itemId]: updated },
    updatedAt: Date.now(),
  };
}

/** Deletes an item and its entire subtree, cleaning up group membership and rule references. */
export function deleteItem(structure: ProductStructure, itemId: string): ProductStructure {
  if (itemId === structure.rootItemId) {
    throw new Error("Root item cannot be deleted");
  }
  const toDelete = new Set<string>();
  const collect = (id: string) => {
    toDelete.add(id);
    const item = structure.items[id];
    if (item) item.children.forEach(collect);
  };
  collect(itemId);

  const items = { ...structure.items };
  toDelete.forEach((id) => delete items[id]);
  // Remove the reference from whichever parent held it.
  for (const id of Object.keys(items)) {
    if (items[id].children.some((c) => toDelete.has(c))) {
      items[id] = { ...items[id], children: items[id].children.filter((c) => !toDelete.has(c)) };
    }
  }

  const groups: ProductStructure["groups"] = {};
  for (const [gid, group] of Object.entries(structure.groups)) {
    if (toDelete.has(group.parentItemId)) continue; // group's parent was deleted
    const memberItemIds = group.memberItemIds.filter((m) => !toDelete.has(m));
    groups[gid] = { ...group, memberItemIds };
  }

  const rules: ProductStructure["rules"] = {};
  for (const [rid, rule] of Object.entries(structure.rules)) {
    if (toDelete.has(rule.sourceItemId) || toDelete.has(rule.targetItemId)) continue;
    rules[rid] = rule;
  }

  return { ...structure, items, groups, rules, updatedAt: Date.now() };
}

/** Moves itemId to be a child of newParentId at the given index among its new siblings. */
export function reparentItem(
  structure: ProductStructure,
  itemId: string,
  newParentId: string,
  index?: number
): ProductStructure {
  if (itemId === structure.rootItemId) throw new Error("Root item cannot be moved");
  if (isSelfOrAncestor(structure, itemId, newParentId)) {
    throw new Error("Kohdenimike ei voi olla siirrettävän nimikkeen omassa alipuussa");
  }
  const newParent = structure.items[newParentId];
  if (!newParent) throw new Error(`Parent item ${newParentId} not found`);
  if (newParent.type !== "assembly" && newParent.type !== "category") {
    throw new Error("Vain kokoonpanolle tai väliotsikolle voi lisätä lapsinimikkeitä");
  }

  const oldParentId = getParentId(structure, itemId);
  const items = { ...structure.items };

  if (oldParentId) {
    items[oldParentId] = {
      ...items[oldParentId],
      children: items[oldParentId].children.filter((c) => c !== itemId),
    };
  }

  const targetChildren = [...(items[newParentId]?.children ?? newParent.children)];
  const insertAt = index === undefined ? targetChildren.length : Math.max(0, Math.min(index, targetChildren.length));
  targetChildren.splice(insertAt, 0, itemId);
  items[newParentId] = { ...items[newParentId], children: targetChildren };

  return { ...structure, items, updatedAt: Date.now() };
}

/** Reorders itemId among its current siblings to the given index. */
export function reorderWithinParent(
  structure: ProductStructure,
  itemId: string,
  newIndex: number
): ProductStructure {
  const parentId = getParentId(structure, itemId);
  if (!parentId) return structure;
  return reparentItem(structure, itemId, parentId, newIndex);
}

export function getSiblings(structure: ProductStructure, itemId: string): string[] {
  const parentId = getParentId(structure, itemId);
  if (!parentId) return [];
  return structure.items[parentId].children.filter((c) => c !== itemId);
}

/**
 * Depth-first list of all item ids starting at rootItemId. Guards against a
 * corrupt/cyclic tree (which should never happen via the UI - reparentItem
 * refuses to create one - but could in principle reach here via directly
 * edited Firestore data) by never revisiting an id, rather than hanging.
 */
export function listAllItemIds(structure: ProductStructure): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    result.push(id);
    const item = structure.items[id];
    if (item) item.children.forEach(visit);
  };
  visit(structure.rootItemId);
  return result;
}

/** Depth-first list of itemId and all its descendants. Cycle-safe, see listAllItemIds. */
export function subtreeIds(structure: ProductStructure, itemId: string): string[] {
  const result: string[] = [];
  const seen = new Set<string>();
  const visit = (id: string) => {
    if (seen.has(id)) return;
    seen.add(id);
    result.push(id);
    const item = structure.items[id];
    if (item) item.children.forEach(visit);
  };
  visit(itemId);
  return result;
}
