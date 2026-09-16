// Tree view (outliner) of the product structure: add/select items, and drag
// items either onto another item (reparent as its child) or onto the thin
// strip below an item (reorder/move as its next sibling).

import { useState } from "react";
import {
  DndContext,
  closestCenter,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { ProductStructure, ValidationIssue } from "../../types";
import { getParentId } from "../../domain/tree";
import { ConfirmDialog } from "../Dialogs";

interface OutlinerProps {
  structure: ProductStructure;
  selectedItemId: string | null;
  onSelect: (itemId: string) => void;
  onReparent: (itemId: string, newParentId: string, index?: number) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (itemId: string) => void;
  issues: ValidationIssue[];
}

export function Outliner({ structure, selectedItemId, onSelect, onReparent, onAddChild, onDelete, issues }: OutlinerProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set([structure.rootItemId]));
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const toggleExpanded = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const errorItemIds = new Set(issues.filter((i) => i.level === "error" && i.itemId).map((i) => i.itemId!));
  const warningItemIds = new Set(issues.filter((i) => i.level === "warning" && i.itemId).map((i) => i.itemId!));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    if (overId.startsWith("into-")) {
      const targetId = overId.slice("into-".length);
      if (targetId === activeId) return;
      const target = structure.items[targetId];
      if (!target || target.type !== "assembly") return;
      onReparent(activeId, targetId);
    } else if (overId.startsWith("after-")) {
      const targetId = overId.slice("after-".length);
      if (targetId === activeId) return;
      const parentId = getParentId(structure, targetId);
      if (!parentId) return;
      const siblings = structure.items[parentId].children;
      let index = siblings.indexOf(targetId) + 1;
      // When reordering within the same parent, removing activeId from its
      // old position shifts every later index down by one - compensate so
      // "after target" still lands right after target's post-removal index.
      const oldParentId = getParentId(structure, activeId);
      if (oldParentId === parentId) {
        const oldIndex = siblings.indexOf(activeId);
        if (oldIndex !== -1 && oldIndex < index) index -= 1;
      }
      onReparent(activeId, parentId, index);
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-700">Nimikepuu</h2>
        <button
          type="button"
          className="rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700"
          onClick={() => onAddChild(structure.rootItemId)}
        >
          + Uusi juuren alle
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2">
        <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <OutlinerNode
            structure={structure}
            itemId={structure.rootItemId}
            depth={0}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
            selectedItemId={selectedItemId}
            onSelect={onSelect}
            onAddChild={onAddChild}
            onDelete={setPendingDeleteId}
            errorItemIds={errorItemIds}
            warningItemIds={warningItemIds}
          />
        </DndContext>
      </div>
      {pendingDeleteId && structure.items[pendingDeleteId] && (
        <ConfirmDialog
          title="Poista nimike"
          message={`Poistetaanko "${structure.items[pendingDeleteId].name}" ja kaikki sen alanimikkeet?`}
          confirmLabel="Poista"
          danger
          onCancel={() => setPendingDeleteId(null)}
          onConfirm={() => {
            const id = pendingDeleteId;
            setPendingDeleteId(null);
            onDelete(id);
          }}
        />
      )}
    </div>
  );
}

interface NodeProps {
  structure: ProductStructure;
  itemId: string;
  depth: number;
  expanded: Set<string>;
  toggleExpanded: (id: string) => void;
  selectedItemId: string | null;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  errorItemIds: Set<string>;
  warningItemIds: Set<string>;
}

function OutlinerNode({
  structure,
  itemId,
  depth,
  expanded,
  toggleExpanded,
  selectedItemId,
  onSelect,
  onAddChild,
  onDelete,
  errorItemIds,
  warningItemIds,
}: NodeProps) {
  const item = structure.items[itemId];
  const isRoot = itemId === structure.rootItemId;

  // Hooks must run unconditionally on every render, so they are called
  // before the `!item` guard below (which can happen transiently between
  // a delete and the outliner re-rendering without the deleted id).
  const draggable = useDraggable({ id: itemId, disabled: isRoot });
  const droppableInto = useDroppable({ id: `into-${itemId}`, disabled: item?.type !== "assembly" });
  const droppableAfter = useDroppable({ id: `after-${itemId}`, disabled: isRoot });

  if (!item) return null;
  const isExpanded = expanded.has(itemId);
  const hasChildren = item.children.length > 0;

  const isSelected = selectedItemId === itemId;
  const hasError = errorItemIds.has(itemId);
  const hasWarning = warningItemIds.has(itemId);

  return (
    <div>
      <div
        ref={droppableInto.setNodeRef}
        style={{ paddingLeft: depth * 16, opacity: draggable.isDragging ? 0.4 : 1 }}
        className={[
          "group flex items-center gap-1 rounded px-1 py-0.5 text-sm",
          isSelected ? "bg-sky-100" : "hover:bg-slate-100",
          droppableInto.isOver ? "outline outline-2 outline-sky-500" : "",
        ].join(" ")}
      >
        <button
          type="button"
          className="w-4 shrink-0 text-slate-400"
          onClick={() => toggleExpanded(itemId)}
          aria-label={isExpanded ? "Sulje" : "Avaa"}
        >
          {hasChildren ? (isExpanded ? "▾" : "▸") : ""}
        </button>
        <span
          ref={draggable.setNodeRef}
          {...draggable.listeners}
          {...draggable.attributes}
          className={`flex cursor-grab select-none items-center gap-1 ${item.type === "assembly" ? "font-medium" : ""}`}
          onClick={() => onSelect(itemId)}
        >
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="h-4 w-4 shrink-0 rounded-sm object-cover" />
          ) : (
            <span className="shrink-0">{item.type === "assembly" ? "📦" : "▫️"}</span>
          )}
          {item.name || "(nimetön)"}
        </span>
        {hasError && <span className="text-red-600" title="Virhe">⚠</span>}
        {!hasError && hasWarning && <span className="text-amber-500" title="Huomio">⚠</span>}
        <span className="ml-auto hidden gap-1 group-hover:flex">
          {item.type === "assembly" && (
            <button
              type="button"
              className="rounded px-1 text-xs text-sky-700 hover:bg-sky-200"
              onClick={() => onAddChild(itemId)}
              title="Lisää lapsinimike"
            >
              +
            </button>
          )}
          {!isRoot && (
            <button
              type="button"
              className="rounded px-1 text-xs text-red-600 hover:bg-red-100"
              onClick={() => onDelete(itemId)}
              title="Poista"
            >
              ✕
            </button>
          )}
        </span>
      </div>
      <div
        ref={droppableAfter.setNodeRef}
        style={{ marginLeft: depth * 16 + 16 }}
        className={`h-1 rounded ${droppableAfter.isOver ? "bg-sky-500" : ""}`}
      />
      {isExpanded &&
        item.children.map((childId) => (
          <OutlinerNode
            key={childId}
            structure={structure}
            itemId={childId}
            depth={depth + 1}
            expanded={expanded}
            toggleExpanded={toggleExpanded}
            selectedItemId={selectedItemId}
            onSelect={onSelect}
            onAddChild={onAddChild}
            onDelete={onDelete}
            errorItemIds={errorItemIds}
            warningItemIds={warningItemIds}
          />
        ))}
    </div>
  );
}
