// Core domain types for the product structure (BOM/PDM-style item tree)
// and the sales configurator simulation built on top of it.

/**
 * "single": leaf item.
 * "assembly": container with children, priced (sumOfChildren or fixed), can be
 *   a selectable choice among its siblings.
 * "category": purely organizational grouping heading, e.g. "Lisävarusteet".
 *   Has only a name/description, no price/code/color. Never itself a
 *   selectable choice - it is automatically active whenever its own parent
 *   is active (see domain/simulation.ts activateCategories), so its children
 *   are always reachable without the user having to pick the heading itself.
 *   Its children otherwise behave completely normally (own groups, pricing, etc).
 */
export type ItemType = "single" | "assembly" | "category";
export type PricingMode = "sumOfChildren" | "fixed";

export interface AttributeEntry {
  key: string;
  value: string;
}

export interface Item {
  id: string;
  name: string;
  code?: string;
  description?: string;
  type: ItemType;
  /** Own price. For assemblies this is only used when pricingMode === "fixed". */
  price?: number;
  /** Only meaningful when type === "assembly". Defaults to "sumOfChildren". */
  pricingMode?: PricingMode;
  color?: string;
  imageUrl?: string;
  attributes: AttributeEntry[];
  /** Attribute keys this item explicitly overrides rather than inheriting from its parent path. */
  overridesParentAttributes: string[];
  /** Child item ids, in display order. Only meaningful when type === "assembly" or "category". */
  children: string[];
  /**
   * Whether this item is mandatory when it does NOT belong to any SelectionGroup.
   * Ungrouped children behave as an implicit singleton group (min/max 0/1 or 1/1).
   * Ignored for items that are members of a SelectionGroup.
   */
  required?: boolean;
  /**
   * Pre-selected when the simulation starts (or is reset). Only a starting
   * point: the user can still change or deselect it, it never locks the choice.
   */
  defaultSelected?: boolean;
}

export interface SelectionGroup {
  id: string;
  name: string;
  /** The assembly item this group's members live under. */
  parentItemId: string;
  /** Item ids belonging to this group. Must all be children of parentItemId. */
  memberItemIds: string[];
  /** Minimum number of members that must be selected. */
  min: number;
  /** Maximum number of members that may be selected. null = unbounded. */
  max: number | null;
}

export type RuleType = "requires" | "excludes";

export interface ConditionalRule {
  id: string;
  type: RuleType;
  sourceItemId: string;
  targetItemId: string;
  /** Free-text note shown in the editor only, not used by the simulation engine. */
  note?: string;
}

export interface ProductStructure {
  id: string;
  name: string;
  rootItemId: string;
  items: Record<string, Item>;
  groups: Record<string, SelectionGroup>;
  rules: Record<string, ConditionalRule>;
  /** Global default value per attribute key (see domain/attributes.ts). */
  attributeDefaults?: Record<string, string>;
  createdAt?: number;
  updatedAt?: number;
}

/** Lightweight summary used for the structures list view. */
export interface ProductStructureSummary {
  id: string;
  name: string;
  updatedAt?: number;
  itemCount: number;
}

export interface ValidationIssue {
  level: "error" | "warning";
  message: string;
  itemId?: string;
  groupId?: string;
  ruleId?: string;
}
