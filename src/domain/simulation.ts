// Simulation engine: given a ProductStructure and a set of currently selected
// item ids, resolves conditional rules, computes selection control state,
// total price and effective (inherited/overridden) attributes.
//
// The simulation never mutates the stored ProductStructure - it is a pure
// walk over it driven by a `selected: Set<string>` of item ids.

import type { ConditionalRule, Item, ProductStructure } from "../types";
import { getParentId, subtreeIds } from "./tree";
import { getGroupForMember, getGroupsForParent, type EffectiveGroup } from "./groups";

/**
 * Root plus every item flagged `defaultSelected` that is reachable and allowed:
 * defaults go through toggleSelection, so group max and rules are respected and
 * a default that conflicts with them is simply skipped. Defaults under an
 * unselected parent are applied once that parent becomes active.
 */
export function createInitialSelection(structure: ProductStructure): Set<string> {
  let selected = applyRules(structure, new Set([structure.rootItemId])).selected;
  const attempted = new Set<string>();
  let progressed = true;
  while (progressed) {
    progressed = false;
    for (const parentId of [...selected]) {
      for (const childId of structure.items[parentId]?.children ?? []) {
        const child = structure.items[childId];
        if (!child?.defaultSelected || child.type === "category" || attempted.has(childId)) continue;
        attempted.add(childId);
        progressed = true;
        if (!selected.has(childId)) selected = toggleSelection(structure, selected, childId);
      }
    }
  }
  return selected;
}

function selectWithAncestors(structure: ProductStructure, selected: Set<string>, itemId: string): Set<string> {
  const next = new Set(selected);
  let current: string | undefined = itemId;
  const visited = new Set<string>(); // guards against a corrupt/cyclic parent chain
  while (current && current !== structure.rootItemId && !visited.has(current)) {
    visited.add(current);
    next.add(current);
    current = getParentId(structure, current);
  }
  next.add(structure.rootItemId);
  return next;
}

function removeWithDescendants(structure: ProductStructure, selected: Set<string>, itemId: string): Set<string> {
  const next = new Set(selected);
  for (const id of subtreeIds(structure, itemId)) next.delete(id);
  return next;
}

/**
 * Category items are never a selectable choice - they auto-activate as soon
 * as their own parent is active, so their children stay reachable without an
 * extra click. Adds every such reachable-but-missing category to `selected`.
 */
function activateCategories(structure: ProductStructure, selected: Set<string>): { selected: Set<string>; changed: boolean } {
  let next = selected;
  let changed = false;
  for (const id of selected) {
    const item = structure.items[id];
    if (!item) continue;
    for (const childId of item.children) {
      if (structure.items[childId]?.type === "category" && !next.has(childId)) {
        if (next === selected) next = new Set(selected);
        next.add(childId);
        changed = true;
      }
    }
  }
  return { selected: next, changed };
}

export interface RuleEffects {
  /** itemId -> human-readable reasons it is force-selected and locked. */
  locked: Map<string, string[]>;
  /** itemId -> human-readable reasons it cannot be selected. */
  disabledExcluded: Map<string, string[]>;
  /** Human-readable messages for rules that contradict each other. */
  conflicts: string[];
}

/**
 * "excludes" is bidirectional: A excludes B implies B excludes A. The stored
 * rule stays one row; the mirror is derived here so existing data works as-is.
 * Exception: two members of the same max=1 group already exclude each other
 * by the group itself, and a mirrored block would make it impossible to switch
 * between them, so no mirror is created for them.
 */
export function withMirroredExcludes(structure: ProductStructure): ConditionalRule[] {
  const result: ConditionalRule[] = [];
  for (const rule of Object.values(structure.rules)) {
    result.push(rule);
    if (rule.type !== "excludes") continue;
    const group = getGroupForMember(structure, rule.sourceItemId);
    if (group && group.max === 1 && group.memberItemIds.includes(rule.targetItemId)) continue;
    result.push({ ...rule, sourceItemId: rule.targetItemId, targetItemId: rule.sourceItemId });
  }
  return result;
}

function applyRules(structure: ProductStructure, selectedIn: Set<string>): { selected: Set<string>; effects: RuleEffects } {
  let selected = new Set(selectedIn);
  const locked = new Map<string, string[]>();
  const disabledExcluded = new Map<string, string[]>();
  const rules = withMirroredExcludes(structure);

  let changed = true;
  let iterations = 0;
  while (changed && iterations < 50) {
    changed = false;
    iterations++;
    for (const rule of rules) {
      const source = structure.items[rule.sourceItemId];
      const target = structure.items[rule.targetItemId];
      if (!source || !target) continue;
      if (!selected.has(rule.sourceItemId)) continue;

      if (rule.type === "requires") {
        const label = `Pakollinen, koska valittuna: "${source.name}"`;
        const reasons = locked.get(rule.targetItemId) ?? [];
        if (!reasons.includes(label)) {
          reasons.push(label);
          locked.set(rule.targetItemId, reasons);
        }
        if (!selected.has(rule.targetItemId)) {
          selected = selectWithAncestors(structure, selected, rule.targetItemId);
          changed = true;
        }
      } else {
        const label = `Ei sallittu yhdessä: "${source.name}"`;
        const reasons = disabledExcluded.get(rule.targetItemId) ?? [];
        if (!reasons.includes(label)) {
          reasons.push(label);
          disabledExcluded.set(rule.targetItemId, reasons);
        }
        if (selected.has(rule.targetItemId)) {
          selected = removeWithDescendants(structure, selected, rule.targetItemId);
          changed = true;
        }
      }
    }

    const categoryResult = activateCategories(structure, selected);
    selected = categoryResult.selected;
    if (categoryResult.changed) changed = true;
  }

  const conflicts: string[] = [];
  for (const [itemId] of locked) {
    if (disabledExcluded.has(itemId)) {
      const name = structure.items[itemId]?.name ?? itemId;
      conflicts.push(`Ristiriitaiset säännöt nimikkeelle "${name}": sääntöjen mukaan se on sekä pakollinen että kielletty samanaikaisesti.`);
    }
  }

  return { selected, effects: { locked, disabledExcluded, conflicts } };
}

/** Toggles selection of a single item, respecting its group's min/max and active rules. */
export function toggleSelection(structure: ProductStructure, selected: Set<string>, itemId: string): Set<string> {
  const parentId = getParentId(structure, itemId);
  if (!parentId) return selected; // root cannot be toggled

  const before = applyRules(structure, selected);
  const isSelected = before.selected.has(itemId);

  if (isSelected) {
    if (before.effects.locked.has(itemId)) return selected; // forced by a requires rule
    const next = removeWithDescendants(structure, before.selected, itemId);
    return applyRules(structure, next).selected;
  }

  if (before.effects.disabledExcluded.has(itemId)) return selected; // forbidden by an excludes rule

  let next = new Set(before.selected);
  const group = getGroupsForParent(structure, parentId).find((g) => g.memberItemIds.includes(itemId));
  if (group) {
    const selectedInGroup = group.memberItemIds.filter((m) => next.has(m));
    if (group.max === 1) {
      for (const m of selectedInGroup) {
        if (!before.effects.locked.has(m)) next = removeWithDescendants(structure, next, m);
      }
    } else if (group.max !== null && selectedInGroup.length >= group.max) {
      return selected; // group is at capacity
    }
  }
  next.add(itemId);
  return applyRules(structure, next).selected;
}

export interface GroupStatus {
  group: EffectiveGroup;
  controlType: "radio" | "checkbox";
  selectedCount: number;
  satisfied: boolean;
}

export function getGroupStatuses(structure: ProductStructure, selected: Set<string>, parentId: string): GroupStatus[] {
  return getGroupsForParent(structure, parentId).map((group) => {
    const selectedCount = group.memberItemIds.filter((m) => selected.has(m)).length;
    const satisfied = selectedCount >= group.min && (group.max === null || selectedCount <= group.max);
    // Only use a true radio control when a choice is mandatory (min=1) among
    // several members - a native radio input cannot be unchecked by clicking
    // it again, so an optional max=1 group is rendered as checkboxes instead
    // (toggleSelection already enforces the max=1 "only one at a time" rule).
    const controlType = group.max === 1 && group.min === 1 && group.memberItemIds.length > 1 ? "radio" : "checkbox";
    return { group, controlType, selectedCount, satisfied };
  });
}

export function computeItemPrice(structure: ProductStructure, itemId: string, selected: Set<string>): number {
  const item = structure.items[itemId];
  if (!item) return 0;
  if (item.type === "single") return item.price ?? 0;
  if (item.pricingMode === "fixed") return item.price ?? 0;
  return item.children
    .filter((c) => selected.has(c))
    .reduce((sum, c) => sum + computeItemPrice(structure, c, selected), 0);
}

export function computeTotalPrice(structure: ProductStructure, selected: Set<string>): number {
  return computeItemPrice(structure, structure.rootItemId, selected);
}

export function computeEffectiveAttributes(structure: ProductStructure, selected: Set<string>): Record<string, string> {
  const effective: Record<string, string> = { ...structure.attributeDefaults };
  const visit = (itemId: string, isRoot: boolean) => {
    const item = structure.items[itemId];
    if (!item) return;
    for (const attr of item.attributes) {
      if (isRoot || item.overridesParentAttributes.includes(attr.key)) {
        effective[attr.key] = attr.value;
      }
    }
    for (const childId of item.children) {
      if (selected.has(childId)) visit(childId, false);
    }
  };
  visit(structure.rootItemId, true);
  return effective;
}

export interface SelectedSummaryNode {
  item: Item;
  depth: number;
}

/** Flat, depth-first list of every currently selected item for the summary panel. */
export function getSelectedSummary(structure: ProductStructure, selected: Set<string>): SelectedSummaryNode[] {
  const result: SelectedSummaryNode[] = [];
  const visit = (itemId: string, depth: number) => {
    const item = structure.items[itemId];
    if (!item) return;
    result.push({ item, depth });
    for (const childId of item.children) {
      if (selected.has(childId)) visit(childId, depth + 1);
    }
  };
  visit(structure.rootItemId, 0);
  return result;
}

export interface SimulationDerived {
  effects: RuleEffects;
  totalPrice: number;
  effectiveAttributes: Record<string, string>;
  summary: SelectedSummaryNode[];
}

export function computeDerivedState(structure: ProductStructure, selected: Set<string>): SimulationDerived {
  const { effects } = applyRules(structure, selected);
  return {
    effects,
    totalPrice: computeTotalPrice(structure, selected),
    effectiveAttributes: computeEffectiveAttributes(structure, selected),
    summary: getSelectedSummary(structure, selected),
  };
}
