// Helpers that turn a parent item's children into the effective set of selection
// controls: explicit SelectionGroups plus implicit singleton groups for any
// child that does not belong to a group.

import type { ProductStructure, SelectionGroup } from "../types";

export interface EffectiveGroup extends SelectionGroup {
  /** True for the synthetic singleton group generated for an ungrouped child. */
  implicit: boolean;
}

export function getGroupsForParent(structure: ProductStructure, parentId: string): EffectiveGroup[] {
  const parent = structure.items[parentId];
  if (!parent) return [];

  const explicitGroups = Object.values(structure.groups).filter((g) => g.parentItemId === parentId);
  const groupedChildIds = new Set(explicitGroups.flatMap((g) => g.memberItemIds));

  const result: EffectiveGroup[] = explicitGroups.map((g) => ({ ...g, implicit: false }));

  for (const childId of parent.children) {
    if (groupedChildIds.has(childId)) continue;
    const child = structure.items[childId];
    if (!child) continue;
    const required = child.required ?? false;
    result.push({
      id: `implicit-${childId}`,
      name: child.name,
      parentItemId: parentId,
      memberItemIds: [childId],
      min: required ? 1 : 0,
      max: 1,
      implicit: true,
    });
  }

  return result;
}

/** Which explicit group (if any) a given child belongs to under its parent. */
export function getGroupForMember(structure: ProductStructure, memberId: string): SelectionGroup | undefined {
  return Object.values(structure.groups).find((g) => g.memberItemIds.includes(memberId));
}
