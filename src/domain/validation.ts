// Structural validation for a ProductStructure, surfaced continuously in the editor.

import type { ProductStructure, ValidationIssue } from "../types";
import { getParentId, listAllItemIds } from "./tree";
import { blockedItems, triggerItems } from "./attributeRules";

export function validateStructure(structure: ProductStructure): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const allIds = new Set(listAllItemIds(structure));

  // Items unreachable from root (should not normally happen, but guards against corrupt state).
  for (const id of Object.keys(structure.items)) {
    if (!allIds.has(id)) {
      issues.push({
        level: "warning",
        message: `Nimike "${structure.items[id].name}" ei ole kiinni puussa (ei saavutettavissa juuresta).`,
        itemId: id,
      });
    }
  }

  // Type/children consistency.
  for (const item of Object.values(structure.items)) {
    if (item.type === "single" && item.children.length > 0) {
      issues.push({
        level: "error",
        message: `Nimike "${item.name}" on tyyppiä "yksittäinen" mutta sillä on lapsinimikkeitä.`,
        itemId: item.id,
      });
    }
    if (item.type === "assembly" && item.pricingMode === "fixed" && item.price === undefined) {
      issues.push({
        level: "warning",
        message: `Kokoonpano "${item.name}" käyttää kiinteää hintaa, mutta hintaa ei ole asetettu.`,
        itemId: item.id,
      });
    }
    for (const attrKey of item.overridesParentAttributes) {
      if (!item.attributes.some((a) => a.key === attrKey)) {
        issues.push({
          level: "warning",
          message: `Nimike "${item.name}" ylikirjoittaa attribuutin "${attrKey}", mutta sillä ei ole arvoa tälle attribuutille.`,
          itemId: item.id,
        });
      }
    }
  }

  // Cycle detection (defensive; reparent already guards against this).
  for (const id of allIds) {
    const seen = new Set<string>();
    let current: string | undefined = id;
    while (current) {
      if (seen.has(current)) {
        issues.push({
          level: "error",
          message: `Nimikepuussa havaittiin sykli kohdassa "${structure.items[id]?.name ?? id}".`,
          itemId: id,
        });
        break;
      }
      seen.add(current);
      current = getParentId(structure, current);
    }
  }

  // Groups.
  const membershipByParent = new Map<string, Map<string, string>>(); // parentId -> memberId -> groupId
  for (const group of Object.values(structure.groups)) {
    const parent = structure.items[group.parentItemId];
    if (!parent) {
      issues.push({
        level: "error",
        message: `Ryhmä "${group.name}" viittaa olemattomaan yläkohteeseen.`,
        groupId: group.id,
      });
      continue;
    }
    if (group.memberItemIds.length === 0) {
      issues.push({
        level: "error",
        message: `Ryhmällä "${group.name}" ei ole yhtään jäsentä.`,
        groupId: group.id,
      });
    }
    if (group.min < 0) {
      issues.push({ level: "error", message: `Ryhmän "${group.name}" minimi ei voi olla negatiivinen.`, groupId: group.id });
    }
    if (group.max !== null && group.max < group.min) {
      issues.push({ level: "error", message: `Ryhmän "${group.name}" maksimi on pienempi kuin minimi.`, groupId: group.id });
    }
    if (group.max !== null && group.max > group.memberItemIds.length) {
      issues.push({
        level: "warning",
        message: `Ryhmän "${group.name}" maksimi (${group.max}) on suurempi kuin jäsenten määrä (${group.memberItemIds.length}).`,
        groupId: group.id,
      });
    }

    let byMember = membershipByParent.get(group.parentItemId);
    if (!byMember) {
      byMember = new Map();
      membershipByParent.set(group.parentItemId, byMember);
    }

    for (const memberId of group.memberItemIds) {
      if (!parent.children.includes(memberId)) {
        issues.push({
          level: "error",
          message: `Ryhmän "${group.name}" jäsen "${structure.items[memberId]?.name ?? memberId}" ei ole yläkohteen "${parent.name}" lapsi.`,
          groupId: group.id,
          itemId: memberId,
        });
      }
      if (structure.items[memberId]?.type === "category") {
        issues.push({
          level: "error",
          message: `Väliotsikko "${structure.items[memberId]?.name}" ei voi kuulua valintaryhmään - se näkyy simuloinnissa aina.`,
          groupId: group.id,
          itemId: memberId,
        });
      }
      const existingGroupId = byMember.get(memberId);
      if (existingGroupId && existingGroupId !== group.id) {
        issues.push({
          level: "error",
          message: `Nimike "${structure.items[memberId]?.name ?? memberId}" kuuluu useampaan ryhmään saman yläkohteen alla.`,
          groupId: group.id,
          itemId: memberId,
        });
      } else {
        byMember.set(memberId, group.id);
      }
    }
  }

  // More than one default in a max=1 group: only the last one applied would survive.
  for (const group of Object.values(structure.groups)) {
    if (group.max !== 1) continue;
    const defaults = group.memberItemIds.filter((m) => structure.items[m]?.defaultSelected);
    if (defaults.length > 1) {
      issues.push({
        level: "warning",
        message: `Ryhmässä "${group.name}" voi valita vain yhden, mutta oletusvalintoja on ${defaults.length}.`,
        groupId: group.id,
      });
    }
  }

  // Rules.
  for (const rule of Object.values(structure.rules)) {
    if (!structure.items[rule.sourceItemId]) {
      issues.push({
        level: "error",
        message: `Sääntö viittaa olemattomaan lähdenimikkeeseen.`,
        ruleId: rule.id,
      });
    }
    if (!structure.items[rule.targetItemId]) {
      issues.push({
        level: "error",
        message: `Sääntö viittaa olemattomaan kohdenimikkeeseen.`,
        ruleId: rule.id,
      });
    }
    if (rule.sourceItemId === rule.targetItemId) {
      issues.push({
        level: "error",
        message: `Sääntö viittaa samaan nimikkeeseen sekä lähteenä että kohteena.`,
        ruleId: rule.id,
      });
    }
  }

  // Excludes is bidirectional, so a reverse excludes rule is redundant and a
  // requires rule between two items that also exclude each other can never hold.
  const rules = Object.values(structure.rules);
  const excludedPairs = new Set<string>();
  const seenExcludes = new Set<string>();
  for (const rule of rules) {
    if (rule.type !== "excludes") continue;
    const name = (id: string) => structure.items[id]?.name ?? id;
    const key = `${rule.sourceItemId}|${rule.targetItemId}`;
    const reverse = `${rule.targetItemId}|${rule.sourceItemId}`;
    excludedPairs.add(key);
    excludedPairs.add(reverse);
    if (seenExcludes.has(reverse)) {
      issues.push({
        level: "warning",
        message: `Poissulkeminen "${name(rule.targetItemId)}" ja "${name(rule.sourceItemId)}" välillä on määritelty kahteen kertaan - poissulkeminen toimii aina molempiin suuntiin, toisen säännön voi poistaa.`,
        ruleId: rule.id,
      });
    }
    seenExcludes.add(key);
  }
  for (const rule of rules) {
    if (rule.type === "requires" && excludedPairs.has(`${rule.sourceItemId}|${rule.targetItemId}`)) {
      issues.push({
        level: "error",
        message: `Ristiriita: "${structure.items[rule.sourceItemId]?.name ?? rule.sourceItemId}" vaatii nimikkeen "${structure.items[rule.targetItemId]?.name ?? rule.targetItemId}", mutta samojen nimikkeiden välillä on myös poissulkemissääntö.`,
        ruleId: rule.id,
      });
    }
  }

  // Attribute rules: warn about rules that can never do anything.
  for (const rule of Object.values(structure.attributeRules ?? {})) {
    if (!rule.whenKey.trim() || !rule.blockKey.trim()) {
      issues.push({
        level: "error",
        message: "Attribuuttisäännöltä puuttuu ehdon tai eston attribuutin nimi.",
        ruleId: rule.id,
      });
      continue;
    }
    const label = `${rule.whenKey.trim()} = ${rule.whenValue.trim()} -> ${rule.blockKey.trim()} = ${rule.blockValue.trim()}`;
    if (triggerItems(structure, rule).length === 0) {
      issues.push({
        level: "warning",
        message: `Attribuuttisääntö (${label}): yhdelläkään nimikkeellä ei ole ehdon attribuuttia, joten sääntö ei koskaan aktivoidu.`,
        ruleId: rule.id,
      });
    } else if (blockedItems(structure, rule).length === 0) {
      issues.push({
        level: "warning",
        message: `Attribuuttisääntö (${label}): yhdelläkään nimikkeellä ei ole estettävää attribuuttia, joten sääntö ei estä mitään.`,
        ruleId: rule.id,
      });
    }
  }

  return issues;
}

export function issuesForItem(issues: ValidationIssue[], itemId: string): ValidationIssue[] {
  return issues.filter((i) => i.itemId === itemId);
}
