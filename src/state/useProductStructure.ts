// Editing state for a single ProductStructure being worked on in the editor.
// Wraps the pure tree.ts mutators, tracks unsaved changes, and exposes
// validation issues recomputed on every change.

import { useCallback, useMemo, useState } from "react";
import type { Item, ProductStructure } from "../types";
import * as tree from "../domain/tree";
import { validateStructure } from "../domain/validation";

export function useProductStructure(initial: ProductStructure) {
  const [structure, setStructure] = useState<ProductStructure>(initial);
  const [savedStructure, setSavedStructure] = useState<ProductStructure>(initial);

  const isDirty = structure !== savedStructure;

  const issues = useMemo(() => validateStructure(structure), [structure]);

  const markSaved = useCallback((s: ProductStructure) => {
    setStructure(s);
    setSavedStructure(s);
  }, []);

  const addItem = useCallback(
    (parentId: string, partial: Partial<Item> & { name: string; type: Item["type"] }) => {
      let newId = "";
      setStructure((s) => {
        const result = tree.addItem(s, parentId, partial);
        newId = result.itemId;
        return result.structure;
      });
      return newId;
    },
    []
  );

  const updateItem = useCallback((itemId: string, changes: Partial<Item>) => {
    setStructure((s) => tree.updateItem(s, itemId, changes));
  }, []);

  const deleteItemById = useCallback((itemId: string) => {
    setStructure((s) => tree.deleteItem(s, itemId));
  }, []);

  const reparentItem = useCallback((itemId: string, newParentId: string, index?: number) => {
    setStructure((s) => {
      try {
        return tree.reparentItem(s, itemId, newParentId, index);
      } catch (e) {
        console.error(e);
        return s;
      }
    });
  }, []);

  const reorderWithinParent = useCallback((itemId: string, newIndex: number) => {
    setStructure((s) => tree.reorderWithinParent(s, itemId, newIndex));
  }, []);

  const replaceStructure = useCallback((s: ProductStructure) => {
    setStructure(s);
  }, []);

  const addGroup = useCallback((parentItemId: string, name: string, memberItemIds: string[]) => {
    const id = crypto.randomUUID();
    setStructure((s) => ({
      ...s,
      groups: { ...s.groups, [id]: { id, name, parentItemId, memberItemIds, min: 0, max: 1 } },
      updatedAt: Date.now(),
    }));
    return id;
  }, []);

  const updateGroup = useCallback((groupId: string, changes: Partial<ProductStructure["groups"][string]>) => {
    setStructure((s) => ({
      ...s,
      groups: { ...s.groups, [groupId]: { ...s.groups[groupId], ...changes, id: groupId } },
      updatedAt: Date.now(),
    }));
  }, []);

  const deleteGroup = useCallback((groupId: string) => {
    setStructure((s) => {
      const groups = { ...s.groups };
      delete groups[groupId];
      return { ...s, groups, updatedAt: Date.now() };
    });
  }, []);

  const addRule = useCallback((changes: Omit<ProductStructure["rules"][string], "id">) => {
    const id = crypto.randomUUID();
    setStructure((s) => ({
      ...s,
      rules: { ...s.rules, [id]: { ...changes, id } },
      updatedAt: Date.now(),
    }));
    return id;
  }, []);

  const updateRule = useCallback((ruleId: string, changes: Partial<ProductStructure["rules"][string]>) => {
    setStructure((s) => ({
      ...s,
      rules: { ...s.rules, [ruleId]: { ...s.rules[ruleId], ...changes, id: ruleId } },
      updatedAt: Date.now(),
    }));
  }, []);

  const deleteRule = useCallback((ruleId: string) => {
    setStructure((s) => {
      const rules = { ...s.rules };
      delete rules[ruleId];
      return { ...s, rules, updatedAt: Date.now() };
    });
  }, []);

  return {
    structure,
    isDirty,
    issues,
    markSaved,
    replaceStructure,
    addItem,
    updateItem,
    deleteItem: deleteItemById,
    reparentItem,
    reorderWithinParent,
    addGroup,
    updateGroup,
    deleteGroup,
    addRule,
    updateRule,
    deleteRule,
  };
}

export type ProductStructureController = ReturnType<typeof useProductStructure>;
