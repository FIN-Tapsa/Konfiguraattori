// Editor for splitting an assembly's direct children into selection groups,
// and setting min/max choice counts. Children not assigned to any explicit
// group are shown separately with a "required" toggle (implicit singleton
// group behaviour, see domain/groups.ts).

import type { ProductStructure, SelectionGroup } from "../../types";
import { getGroupForMember } from "../../domain/groups";

interface GroupsEditorProps {
  structure: ProductStructure;
  parentItemId: string;
  onAddGroup: (parentItemId: string, name: string, memberItemIds: string[]) => void;
  onUpdateGroup: (groupId: string, changes: Partial<SelectionGroup>) => void;
  onDeleteGroup: (groupId: string) => void;
  onUpdateItemRequired: (itemId: string, required: boolean) => void;
}

export function GroupsEditor({
  structure,
  parentItemId,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onUpdateItemRequired,
}: GroupsEditorProps) {
  const parent = structure.items[parentItemId];
  if (!parent) return null;

  const groups = Object.values(structure.groups).filter((g) => g.parentItemId === parentItemId);
  const groupedIds = new Set(groups.flatMap((g) => g.memberItemIds));
  // Category children are never a selectable choice (they auto-activate, see
  // domain/simulation.ts) so they don't need group assignment or a required toggle.
  const ungrouped = parent.children.filter((c) => !groupedIds.has(c) && structure.items[c]?.type !== "category");
  const categoryChildren = parent.children.filter((c) => structure.items[c]?.type === "category");

  const moveMember = (memberId: string, targetGroupId: string | "none") => {
    const currentGroup = getGroupForMember(structure, memberId);
    if (currentGroup) {
      onUpdateGroup(currentGroup.id, { memberItemIds: currentGroup.memberItemIds.filter((m) => m !== memberId) });
    }
    if (targetGroupId !== "none") {
      const target = structure.groups[targetGroupId];
      onUpdateGroup(targetGroupId, { memberItemIds: [...target.memberItemIds, memberId] });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-700">Valintaryhmät kohteelle "{parent.name}"</h3>
        <button
          type="button"
          className="rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700"
          onClick={() => onAddGroup(parentItemId, "Uusi ryhmä", [])}
        >
          + Uusi ryhmä
        </button>
      </div>

      {groups.length === 0 && <p className="text-sm text-slate-400">Ei valintaryhmiä vielä.</p>}

      {groups.map((group) => (
        <div key={group.id} className="rounded border border-slate-300 p-2">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              className="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1 text-sm font-medium"
              value={group.name}
              onChange={(e) => onUpdateGroup(group.id, { name: e.target.value })}
            />
            <label className="flex items-center gap-1 text-xs text-slate-600">
              min
              <input
                type="number"
                min={0}
                className="w-14 rounded border border-slate-300 px-1 py-0.5"
                value={group.min}
                onChange={(e) => onUpdateGroup(group.id, { min: Number(e.target.value) })}
              />
            </label>
            <label className="flex items-center gap-1 text-xs text-slate-600">
              max
              <input
                type="number"
                min={0}
                className="w-14 rounded border border-slate-300 px-1 py-0.5"
                placeholder="∞"
                value={group.max ?? ""}
                onChange={(e) => onUpdateGroup(group.id, { max: e.target.value === "" ? null : Number(e.target.value) })}
              />
            </label>
            <button
              type="button"
              className="rounded px-2 py-1 text-xs text-red-600 hover:bg-red-100"
              onClick={() => onDeleteGroup(group.id)}
            >
              Poista ryhmä
            </button>
          </div>
          <p className="mb-1 text-xs text-slate-500">
            {group.min === 1 && group.max === 1 && "Pakollinen, tasan yksi (radio)"}
            {group.min === 0 && group.max === 1 && "Valinnainen, korkeintaan yksi"}
            {group.min >= 1 && group.max !== 1 && "Pakollinen, useampi sallittu"}
            {group.min === 0 && group.max !== 1 && "Vapaa monivalinta"}
          </p>
          <ul className="flex flex-col gap-1">
            {group.memberItemIds.map((memberId) => (
              <li key={memberId} className="flex items-center justify-between text-sm">
                <span>{structure.items[memberId]?.name ?? memberId}</span>
                <button
                  type="button"
                  className="text-xs text-slate-500 hover:text-red-600"
                  onClick={() => moveMember(memberId, "none")}
                >
                  poista ryhmästä
                </button>
              </li>
            ))}
            {group.memberItemIds.length === 0 && <li className="text-xs text-red-500">Ei jäseniä</li>}
          </ul>
        </div>
      ))}

      <div>
        <h4 className="mb-1 text-sm font-semibold text-slate-700">Ryhmittelemättömät lapset</h4>
        {ungrouped.length === 0 && <p className="text-sm text-slate-400">Kaikki lapset on jaettu ryhmiin.</p>}
        <ul className="flex flex-col gap-1">
          {ungrouped.map((childId) => {
            const child = structure.items[childId];
            if (!child) return null;
            return (
              <li key={childId} className="flex flex-wrap items-center gap-2 rounded border border-slate-200 px-2 py-1 text-sm">
                <span className="flex-1">{child.name}</span>
                <label className="flex items-center gap-1 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    checked={child.required ?? false}
                    onChange={(e) => onUpdateItemRequired(childId, e.target.checked)}
                  />
                  Pakollinen
                </label>
                {groups.length > 0 && (
                  <select
                    className="rounded border border-slate-300 px-1 py-0.5 text-xs"
                    value="none"
                    onChange={(e) => moveMember(childId, e.target.value)}
                  >
                    <option value="none">Lisää ryhmään...</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {categoryChildren.length > 0 && (
        <div>
          <h4 className="mb-1 text-sm font-semibold text-slate-700">Väliotsikot</h4>
          <p className="mb-1 text-xs text-slate-400">
            Väliotsikot näkyvät simuloinnissa aina, ilman omaa valintaa - eivät tarvitse ryhmää.
          </p>
          <ul className="flex flex-col gap-1">
            {categoryChildren.map((childId) => {
              const child = structure.items[childId];
              if (!child) return null;
              return (
                <li key={childId} className="rounded border border-slate-200 px-2 py-1 text-sm text-slate-600">
                  📁 {child.name}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
