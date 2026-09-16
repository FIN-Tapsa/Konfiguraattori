// Excel (.xlsx) import/export for a ProductStructure.
//
// Two sheets: "Nimikkeet" (items) and "Säännöt" (rules). The columns listed in
// the product spec are always read/written; a handful of extra columns
// (code, attributes, overrides_parent_attributes, required) are included too
// so a round-trip export -> import does not lose data the spec's core model
// needs elsewhere (attributes, overrides, ungrouped-required flag).

import * as XLSX from "xlsx";
import { v4 as uuid } from "uuid";
import type { AttributeEntry, ConditionalRule, Item, ProductStructure, SelectionGroup } from "../types";

const ITEMS_SHEET = "Nimikkeet";
const RULES_SHEET = "Säännöt";

const ITEM_COLUMNS = [
  "id",
  "parent_id",
  "name",
  "code",
  "description",
  "type",
  "price",
  "pricing_mode",
  "color",
  "image_url",
  "attributes",
  "overrides_parent_attributes",
  "required",
  "group_id",
  "group_name",
  "group_min",
  "group_max",
] as const;

const RULE_COLUMNS = ["rule_id", "type", "source_item_id", "target_item_id", "note"] as const;

export interface ImportError {
  sheet: string;
  row: number;
  message: string;
}

export type ImportResult =
  | { success: true; structure: ProductStructure }
  | { success: false; errors: ImportError[] };

function serializeAttributes(attributes: AttributeEntry[]): string {
  return attributes
    .filter((a) => a.key.trim() !== "")
    .map((a) => `${a.key}=${a.value}`)
    .join("|");
}

function parseAttributes(raw: unknown): AttributeEntry[] {
  const str = String(raw ?? "").trim();
  if (!str) return [];
  return str
    .split("|")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const idx = pair.indexOf("=");
      if (idx === -1) return { key: pair, value: "" };
      return { key: pair.slice(0, idx).trim(), value: pair.slice(idx + 1).trim() };
    });
}

function parseList(raw: unknown): string[] {
  const str = String(raw ?? "").trim();
  if (!str) return [];
  return str
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBool(raw: unknown): boolean {
  const str = String(raw ?? "").trim().toLowerCase();
  return str === "true" || str === "1" || str === "kyllä" || str === "x";
}

function parseNumberOrUndefined(raw: unknown): number | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) ? n : undefined;
}

export function exportToWorkbook(structure: ProductStructure): void {
  const itemRows: Record<string, unknown>[] = [];
  const memberToGroup = new Map<string, SelectionGroup>();
  for (const group of Object.values(structure.groups)) {
    for (const memberId of group.memberItemIds) memberToGroup.set(memberId, group);
  }

  const visit = (itemId: string, parentId: string | null) => {
    const item = structure.items[itemId];
    if (!item) return;
    const group = memberToGroup.get(itemId);
    itemRows.push({
      id: item.id,
      parent_id: parentId ?? "",
      name: item.name,
      code: item.code ?? "",
      description: item.description ?? "",
      type: item.type,
      price: item.price ?? "",
      pricing_mode: item.type === "assembly" ? item.pricingMode ?? "sumOfChildren" : "",
      color: item.color ?? "",
      image_url: item.imageUrl ?? "",
      attributes: serializeAttributes(item.attributes),
      overrides_parent_attributes: item.overridesParentAttributes.join(","),
      required: item.required ? "TRUE" : "FALSE",
      group_id: group?.id ?? "",
      group_name: group?.name ?? "",
      group_min: group ? group.min : "",
      group_max: group ? (group.max === null ? "" : group.max) : "",
    });
    item.children.forEach((childId) => visit(childId, itemId));
  };
  visit(structure.rootItemId, null);

  const ruleRows = Object.values(structure.rules).map((rule) => ({
    rule_id: rule.id,
    type: rule.type,
    source_item_id: rule.sourceItemId,
    target_item_id: rule.targetItemId,
    note: rule.note ?? "",
  }));

  const workbook = XLSX.utils.book_new();
  const itemsSheet = XLSX.utils.json_to_sheet(itemRows, { header: [...ITEM_COLUMNS] });
  const rulesSheet = XLSX.utils.json_to_sheet(ruleRows, { header: [...RULE_COLUMNS] });
  XLSX.utils.book_append_sheet(workbook, itemsSheet, ITEMS_SHEET);
  XLSX.utils.book_append_sheet(workbook, rulesSheet, RULES_SHEET);

  const safeName = structure.name.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) || "tuoterakenne";
  XLSX.writeFile(workbook, `${safeName}.xlsx`);
}

export async function importFromFile(file: File, structureName: string): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array" });

  const itemsSheet = workbook.Sheets[ITEMS_SHEET];
  const rulesSheet = workbook.Sheets[RULES_SHEET];

  const errors: ImportError[] = [];
  if (!itemsSheet) errors.push({ sheet: ITEMS_SHEET, row: 0, message: `Välilehteä "${ITEMS_SHEET}" ei löytynyt.` });
  if (!rulesSheet) errors.push({ sheet: RULES_SHEET, row: 0, message: `Välilehteä "${RULES_SHEET}" ei löytynyt.` });
  if (errors.length > 0) return { success: false, errors };

  const itemRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(itemsSheet, { defval: "" });
  const ruleRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(rulesSheet, { defval: "" });

  // --- Parse & validate item rows -----------------------------------------
  const items: Record<string, Item> = {};
  const parentOf = new Map<string, string | null>();
  const childOrder = new Map<string, string[]>(); // parentId(or "root") -> ordered child ids
  const seenIds = new Set<string>();
  let rootId: string | null = null;

  itemRows.forEach((row, idx) => {
    const excelRow = idx + 2; // header is row 1
    const id = String(row.id ?? "").trim();
    const name = String(row.name ?? "").trim();
    const rawParent = String(row.parent_id ?? "").trim();
    const type = String(row.type ?? "").trim();

    if (!id) {
      errors.push({ sheet: ITEMS_SHEET, row: excelRow, message: "id-sarake on tyhjä." });
      return;
    }
    if (seenIds.has(id)) {
      errors.push({ sheet: ITEMS_SHEET, row: excelRow, message: `id "${id}" esiintyy useammalla rivillä.` });
      return;
    }
    seenIds.add(id);
    if (!name) {
      errors.push({ sheet: ITEMS_SHEET, row: excelRow, message: `Nimikkeeltä "${id}" puuttuu nimi.` });
    }
    if (type !== "single" && type !== "assembly") {
      errors.push({
        sheet: ITEMS_SHEET,
        row: excelRow,
        message: `Nimikkeen "${id}" type on "${type}", pitää olla "single" tai "assembly".`,
      });
      return;
    }
    if (!rawParent) {
      if (rootId !== null) {
        errors.push({
          sheet: ITEMS_SHEET,
          row: excelRow,
          message: `Useampi juurinimike (tyhjä parent_id): "${rootId}" ja "${id}". Vain yksi juuri sallitaan.`,
        });
        return;
      }
      rootId = id;
    }

    const priceRaw = row.price;
    const price = parseNumberOrUndefined(priceRaw);
    if (priceRaw !== "" && priceRaw !== undefined && price === undefined) {
      errors.push({ sheet: ITEMS_SHEET, row: excelRow, message: `Nimikkeen "${id}" price ei ole numero.` });
    }

    const pricingModeRaw = String(row.pricing_mode ?? "").trim();
    const pricingMode = pricingModeRaw === "fixed" ? "fixed" : "sumOfChildren";
    if (pricingModeRaw && pricingModeRaw !== "fixed" && pricingModeRaw !== "sumOfChildren") {
      errors.push({
        sheet: ITEMS_SHEET,
        row: excelRow,
        message: `Nimikkeen "${id}" pricing_mode on "${pricingModeRaw}", pitää olla "sumOfChildren" tai "fixed".`,
      });
    }

    const item: Item = {
      id,
      name,
      code: String(row.code ?? "").trim() || undefined,
      description: String(row.description ?? "").trim() || undefined,
      type: type as Item["type"],
      price,
      pricingMode: type === "assembly" ? pricingMode : undefined,
      color: String(row.color ?? "").trim() || undefined,
      imageUrl: String(row.image_url ?? "").trim() || undefined,
      attributes: parseAttributes(row.attributes),
      overridesParentAttributes: parseList(row.overrides_parent_attributes),
      children: [],
      required: parseBool(row.required),
    };
    items[id] = item;
    parentOf.set(id, rawParent || null);
    const bucketKey = rawParent || "__root__";
    const bucket = childOrder.get(bucketKey) ?? [];
    bucket.push(id);
    childOrder.set(bucketKey, bucket);
  });

  if (errors.length > 0) return { success: false, errors };

  if (!rootId) {
    errors.push({ sheet: ITEMS_SHEET, row: 0, message: "Yhtään juurinimikettä ei löytynyt (rivi jolla parent_id on tyhjä)." });
    return { success: false, errors };
  }

  // Validate parent_id references.
  itemRows.forEach((row, idx) => {
    const excelRow = idx + 2;
    const id = String(row.id ?? "").trim();
    if (!id || !items[id]) return;
    const rawParent = String(row.parent_id ?? "").trim();
    if (rawParent && !items[rawParent]) {
      errors.push({ sheet: ITEMS_SHEET, row: excelRow, message: `Nimikkeen "${id}" parent_id "${rawParent}" ei vastaa mitään id:tä.` });
    }
    if (rawParent && items[rawParent] && items[rawParent].type !== "assembly") {
      errors.push({
        sheet: ITEMS_SHEET,
        row: excelRow,
        message: `Nimikkeen "${id}" yläkohde "${rawParent}" ei ole tyyppiä "assembly", joten sillä ei voi olla lapsia.`,
      });
    }
  });

  if (errors.length > 0) return { success: false, errors };

  // Wire up children in row order and detect unreachable / cyclic items.
  for (const [id, item] of Object.entries(items)) {
    item.children = childOrder.get(id) ?? [];
  }

  const reachable = new Set<string>();
  const stack: string[] = [rootId];
  while (stack.length > 0) {
    const current = stack.pop()!;
    if (reachable.has(current)) continue;
    reachable.add(current);
    for (const childId of items[current]?.children ?? []) stack.push(childId);
  }
  for (const id of Object.keys(items)) {
    if (!reachable.has(id)) {
      errors.push({ sheet: ITEMS_SHEET, row: 0, message: `Nimike "${id}" ei ole yhteydessä juureen (mahdollinen sykli tai irrallinen haara).` });
    }
  }
  if (reachable.size !== Object.keys(items).length) {
    return { success: false, errors };
  }

  // --- Groups --------------------------------------------------------------
  const groups: Record<string, SelectionGroup> = {};
  const groupParent = new Map<string, string>(); // group_id -> parent_id it was first seen under

  itemRows.forEach((row, idx) => {
    const excelRow = idx + 2;
    const id = String(row.id ?? "").trim();
    if (!id || !items[id]) return;
    const groupId = String(row.group_id ?? "").trim();
    if (!groupId) return;
    const parentId = parentOf.get(id) ?? "";

    const priorParent = groupParent.get(groupId);
    if (priorParent !== undefined && priorParent !== parentId) {
      errors.push({
        sheet: ITEMS_SHEET,
        row: excelRow,
        message: `group_id "${groupId}" esiintyy useamman kuin yhden yläkohteen (parent_id) alla.`,
      });
      return;
    }
    groupParent.set(groupId, parentId);

    const min = parseNumberOrUndefined(row.group_min) ?? 0;
    const maxRaw = row.group_max;
    const max = maxRaw === "" || maxRaw === undefined ? null : parseNumberOrUndefined(maxRaw) ?? null;

    const existing = groups[groupId];
    if (!existing) {
      groups[groupId] = {
        id: groupId,
        name: String(row.group_name ?? "").trim() || groupId,
        parentItemId: parentId,
        memberItemIds: [id],
        min,
        max,
      };
    } else {
      existing.memberItemIds.push(id);
    }
  });

  if (errors.length > 0) return { success: false, errors };

  // --- Rules -----------------------------------------------------------------
  const rules: Record<string, ConditionalRule> = {};
  const seenRuleIds = new Set<string>();
  ruleRows.forEach((row, idx) => {
    const excelRow = idx + 2;
    const ruleId = String(row.rule_id ?? "").trim() || uuid();
    if (seenRuleIds.has(ruleId)) {
      errors.push({ sheet: RULES_SHEET, row: excelRow, message: `rule_id "${ruleId}" esiintyy useammalla rivillä.` });
      return;
    }
    seenRuleIds.add(ruleId);
    const type = String(row.type ?? "").trim();
    const sourceId = String(row.source_item_id ?? "").trim();
    const targetId = String(row.target_item_id ?? "").trim();

    if (type !== "requires" && type !== "excludes") {
      errors.push({ sheet: RULES_SHEET, row: excelRow, message: `type on "${type}", pitää olla "requires" tai "excludes".` });
      return;
    }
    if (!items[sourceId]) {
      errors.push({ sheet: RULES_SHEET, row: excelRow, message: `source_item_id "${sourceId}" ei vastaa mitään nimikettä.` });
      return;
    }
    if (!items[targetId]) {
      errors.push({ sheet: RULES_SHEET, row: excelRow, message: `target_item_id "${targetId}" ei vastaa mitään nimikettä.` });
      return;
    }
    rules[ruleId] = {
      id: ruleId,
      type: type as ConditionalRule["type"],
      sourceItemId: sourceId,
      targetItemId: targetId,
      note: String(row.note ?? "").trim() || undefined,
    };
  });

  if (errors.length > 0) return { success: false, errors };

  const structure: ProductStructure = {
    id: uuid(),
    name: structureName,
    rootItemId: rootId,
    items,
    groups,
    rules,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  return { success: true, structure };
}
