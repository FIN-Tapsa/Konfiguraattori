// Tree view (outliner) of the product structure: add/select items, and drag
// items either onto another item (reparent as its child) or onto the thin
// strip below an item (reorder/move as its next sibling). Sibling items that
// belong to the same SelectionGroup are visually framed together.

import { useEffect, useState } from "react";
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { ProductStructure, ValidationIssue } from "../../types";
import { getParentId } from "../../domain/tree";
import { getGroupsForParent } from "../../domain/groups";
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
  // Without an activation distance, dnd-kit starts a "drag" on every
  // pointerdown (even with zero movement) and then swallows the click that
  // would normally follow - so plain clicks on tree rows never reach
  // onSelect. Require a few pixels of movement before a drag counts.
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  // Keep the selected item visible: expand every ancestor whenever selection
  // changes (e.g. right after adding a child under a collapsed parent).
  useEffect(() => {
    if (!selectedItemId) return;
    const ancestors: string[] = [];
    const seen = new Set<string>();
    let current = getParentId(structure, selectedItemId);
    while (current && !seen.has(current)) {
      seen.add(current);
      ancestors.push(current);
      current = getParentId(structure, current);
    }
    setExpanded((prev) => (ancestors.every((a) => prev.has(a)) ? prev : new Set([...prev, ...ancestors])));
    // Only on selection change: re-running on every structure edit would re-open nodes the user collapsed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedItemId]);

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
      if (!target || (target.type !== "assembly" && target.type !== "category")) return;
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

  const nodeProps: Omit<NodeProps, "itemId" | "depth"> = {
    structure,
    expanded,
    toggleExpanded,
    selectedItemId,
    onSelect,
    onAddChild,
    onDelete: setPendingDeleteId,
    errorItemIds,
    warningItemIds,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[var(--line)] px-3 py-2.5">
        <h2 className="text-sm font-semibold text-[var(--ink)]">Nimikepuu</h2>
        <button
          type="button"
          className="rounded-lg bg-[var(--accent)] px-2 py-1 text-xs font-medium text-[var(--on-accent)] transition hover:opacity-90"
          onClick={() => onAddChild(structure.rootItemId)}
        >
          + Uusi juuren alle
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <OutlinerNode itemId={structure.rootItemId} depth={0} {...nodeProps} />
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

function OutlinerNode(props: NodeProps) {
  const { structure, itemId, depth, expanded, toggleExpanded, selectedItemId, onSelect, onAddChild, onDelete, errorItemIds, warningItemIds } =
    props;
  const item = structure.items[itemId];
  const isRoot = itemId === structure.rootItemId;

  // Hooks must run unconditionally on every render, so they are called
  // before the `!item` guard below (which can happen transiently between
  // a delete and the outliner re-rendering without the deleted id).
  const draggable = useDraggable({ id: itemId, disabled: isRoot });
  const droppableInto = useDroppable({ id: `into-${itemId}`, disabled: item?.type !== "assembly" && item?.type !== "category" });
  const droppableAfter = useDroppable({ id: `after-${itemId}`, disabled: isRoot });

  if (!item) return null;
  const isExpanded = expanded.has(itemId);
  const hasChildren = item.children.length > 0;
  const isSelected = selectedItemId === itemId;
  const hasError = errorItemIds.has(itemId);
  const hasWarning = warningItemIds.has(itemId);
  const isRequired = item.required === true;

  const iconClasses =
    item.type === "assembly"
      ? "border border-[var(--accent-line)] bg-[var(--accent-soft)]"
      : item.type === "category"
        ? ""
        : "border border-dashed border-[var(--line-2)]";

  return (
    <div>
      <div
        ref={droppableInto.setNodeRef}
        style={{ paddingLeft: depth * 16, opacity: draggable.isDragging ? 0.4 : 1, minHeight: 22 }}
        className={[
          "group flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-sm transition-colors",
          isSelected ? "bg-[var(--accent)] text-[var(--on-accent)]" : "text-[var(--ink)] hover:bg-[var(--panel-2)]",
          droppableInto.isOver ? "outline outline-2 outline-[var(--accent)]" : "",
        ].join(" ")}
      >
        <button
          type="button"
          className={`w-3.5 shrink-0 text-xs ${isSelected ? "text-[var(--on-accent)]" : "text-[var(--ink-3)]"}`}
          onClick={() => toggleExpanded(itemId)}
          aria-label={isExpanded ? "Sulje" : "Avaa"}
        >
          {hasChildren ? (isExpanded ? "▾" : "▸") : ""}
        </button>
        <span
          ref={draggable.setNodeRef}
          {...draggable.listeners}
          {...draggable.attributes}
          className={`flex min-w-0 flex-1 cursor-grab select-none items-center gap-1.5 ${item.type !== "single" ? "font-semibold" : ""} ${
            item.type === "category" ? "italic opacity-80" : ""
          }`}
          onClick={() => onSelect(itemId)}
        >
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="h-4 w-4 shrink-0 rounded-full object-cover" />
          ) : item.color ? (
            <span
              className="h-3 w-3 shrink-0 rounded-full border border-black/10"
              style={{ backgroundColor: item.color }}
              aria-hidden="true"
            />
          ) : (
            <span
              className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full text-[9px] leading-none ${iconClasses}`}
              aria-hidden="true"
            >
              {item.type === "category" ? "📁" : ""}
            </span>
          )}
          <span className="truncate">{item.name || "(nimetön)"}</span>
        </span>
        {isRequired && (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              isSelected ? "bg-black/10 text-[var(--on-accent)]" : "bg-[var(--warn-soft)] text-[var(--warn)]"
            }`}
          >
            pakollinen
          </span>
        )}
        {item.defaultSelected && (
          <span
            className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${
              isSelected ? "bg-black/10 text-[var(--on-accent)]" : "bg-[var(--accent-soft)] text-[var(--ink-2)]"
            }`}
            title="Oletuksena valittuna simuloinnissa"
          >
            oletus
          </span>
        )}
        {hasError && <span className={isSelected ? "text-[var(--on-accent)]" : "text-[var(--warn)]"} title="Virhe">⚠</span>}
        {!hasError && hasWarning && (
          <span className={isSelected ? "text-[var(--on-accent)]" : "text-[var(--warn)]"} title="Huomio">
            ⚠
          </span>
        )}
        {item.price ? (
          <span className={`shrink-0 font-mono text-xs ${isSelected ? "text-[var(--on-accent)]" : "text-[var(--ink-3)]"}`}>
            {item.price.toLocaleString("fi-FI")} €
          </span>
        ) : null}
        <span className="hidden shrink-0 gap-1 group-hover:flex">
          {(item.type === "assembly" || item.type === "category") && (
            <button
              type="button"
              className={`rounded px-1 text-xs transition ${
                isSelected ? "hover:bg-black/10" : "text-[var(--accent-line)] hover:bg-[var(--accent-soft)]"
              }`}
              onClick={() => onAddChild(itemId)}
              title="Lisää lapsinimike"
            >
              +
            </button>
          )}
          {!isRoot && (
            <button
              type="button"
              className={`rounded px-1 text-xs transition ${isSelected ? "hover:bg-black/10" : "text-[var(--warn)] hover:bg-[var(--warn-soft)]"}`}
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
        className={`h-1 rounded ${droppableAfter.isOver ? "bg-[var(--accent)]" : ""}`}
      />
      {isExpanded && hasChildren && <OutlinerChildren {...props} parentId={itemId} depth={depth + 1} />}
    </div>
  );
}

// Renders a parent's children in their actual order: category items (which
// getGroupsForParent excludes, since they're never a selectable choice) as
// plain rows, and the rest grouped by SelectionGroup - explicit groups get a
// bordered frame (highlighted when they contain the selected item),
// ungrouped/implicit-singleton children render as plain rows.
function OutlinerChildren(props: Omit<NodeProps, "itemId"> & { parentId: string }) {
  const { structure, parentId, depth, selectedItemId } = props;
  const parent = structure.items[parentId];
  if (!parent) return null;

  const groupByMemberId = new Map<string, ReturnType<typeof getGroupsForParent>[number]>();
  for (const group of getGroupsForParent(structure, parentId)) {
    for (const memberId of group.memberItemIds) groupByMemberId.set(memberId, group);
  }

  const rendered = new Set<string>();
  const rows: React.ReactNode[] = [];

  for (const childId of parent.children) {
    if (rendered.has(childId)) continue;
    const child = structure.items[childId];
    if (!child) continue;

    if (child.type === "category") {
      rendered.add(childId);
      rows.push(<OutlinerNode key={childId} {...props} itemId={childId} />);
      continue;
    }

    const group = groupByMemberId.get(childId);
    if (!group) continue;
    group.memberItemIds.forEach((m) => rendered.add(m));

    if (group.implicit) {
      rows.push(<OutlinerNode key={childId} {...props} itemId={childId} />);
      continue;
    }

    const isActiveGroup = group.memberItemIds.includes(selectedItemId ?? "");
    rows.push(
      <div
        key={group.id}
        style={{ marginLeft: depth * 16 - 8 }}
        className={`my-1 rounded-r-lg border-l-2 py-1 pl-1.5 ${
          isActiveGroup ? "border-[var(--accent-line)] bg-[var(--accent-soft)]" : "border-[var(--line-2)]"
        }`}
      >
        <p className="mb-0.5 px-1 font-mono text-[10px] uppercase tracking-wide text-[var(--ink-3)]">{group.name}</p>
        {group.memberItemIds.map((memberId) => (
          <OutlinerNode key={memberId} {...props} itemId={memberId} depth={0} />
        ))}
      </div>
    );
  }

  return <>{rows}</>;
}
