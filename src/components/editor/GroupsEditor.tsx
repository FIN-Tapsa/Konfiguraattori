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
      <div className="flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-semibold text-[var(--ink)]">Ryhmät: {parent.name}</h3>
        <button
          type="button"
          className="shrink-0 rounded-lg bg-[var(--accent)] px-2 py-1 text-xs font-medium text-[var(--on-accent)] transition hover:opacity-90"
          onClick={() => onAddGroup(parentItemId, "Uusi ryhmä", [])}
        >
          + Ryhmä
        </button>
      </div>

      {groups.length === 0 && <p className="text-sm text-[var(--ink-3)]">Ei valintaryhmiä vielä.</p>}

      {groups.map((group) => (
        <div key={group.id} className="rounded-[14px] border border-[var(--line)] bg-[var(--panel-2)] p-3">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <input
              type="text"
              className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 py-0.5 text-sm font-medium text-[var(--ink)] outline-none transition hover:border-[var(--line)] focus:border-[var(--accent)] focus:bg-[var(--panel)]"
              value={group.name}
              onChange={(e) => onUpdateGroup(group.id, { name: e.target.value })}
            />
            <button
              type="button"
              className="shrink-0 rounded-md px-2 py-1 text-xs text-[var(--warn)] transition hover:bg-[var(--warn-soft)]"
              onClick={() => onDeleteGroup(group.id)}
            >
              Poista
            </button>
          </div>
          <div className="mb-2 flex flex-wrap items-center gap-3">
            <Stepper label="min" value={group.min} onChange={(v) => onUpdateGroup(group.id, { min: v ?? 0 })} />
            <Stepper
              label="max"
              value={group.max}
              infinite
              onChange={(v) => onUpdateGroup(group.id, { max: v })}
            />
          </div>
          <p className="mb-2 font-mono text-[11px] text-[var(--ink-3)]">
            {group.min === 1 && group.max === 1 && "pakollinen · tasan 1 (radio)"}
            {group.min === 0 && group.max === 1 && "valinnainen · korkeintaan 1"}
            {group.min >= 1 && group.max !== 1 && "pakollinen · useampi sallittu"}
            {group.min === 0 && group.max !== 1 && "vapaa monivalinta"}
          </p>
          <ul className="flex flex-col gap-1">
            {group.memberItemIds.map((memberId) => (
              <li
                key={memberId}
                className="flex items-center justify-between rounded-md bg-[var(--panel)] px-2 py-1 text-sm text-[var(--ink)]"
              >
                <span className="truncate">{structure.items[memberId]?.name ?? memberId}</span>
                <button
                  type="button"
                  className="shrink-0 text-xs text-[var(--ink-3)] transition hover:text-[var(--warn)]"
                  onClick={() => moveMember(memberId, "none")}
                >
                  poista ryhmästä
                </button>
              </li>
            ))}
            {group.memberItemIds.length === 0 && <li className="text-xs text-[var(--warn)]">Ei jäseniä</li>}
          </ul>
        </div>
      ))}

      <div>
        <h4 className="mb-1 text-sm font-semibold text-[var(--ink)]">Ryhmittelemättömät lapset</h4>
        {ungrouped.length === 0 && <p className="text-sm text-[var(--ink-3)]">Kaikki lapset on jaettu ryhmiin.</p>}
        <ul className="flex flex-col gap-1">
          {ungrouped.map((childId) => {
            const child = structure.items[childId];
            if (!child) return null;
            return (
              <li
                key={childId}
                className="flex flex-wrap items-center gap-2 rounded-md border border-[var(--line)] px-2 py-1 text-sm text-[var(--ink)]"
              >
                <span className="min-w-0 flex-1 truncate">{child.name}</span>
                <label className="flex shrink-0 items-center gap-1 text-xs text-[var(--ink-2)]">
                  <input
                    type="checkbox"
                    checked={child.required ?? false}
                    onChange={(e) => onUpdateItemRequired(childId, e.target.checked)}
                  />
                  Pakollinen
                </label>
                {groups.length > 0 && (
                  <select
                    className="shrink-0 rounded-md border border-[var(--line)] bg-[var(--panel-2)] px-1 py-0.5 text-xs text-[var(--ink)]"
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
          <h4 className="mb-1 text-sm font-semibold text-[var(--ink)]">Väliotsikot</h4>
          <p className="mb-1 text-xs text-[var(--ink-3)]">
            Väliotsikot näkyvät simuloinnissa aina, ilman omaa valintaa - eivät tarvitse ryhmää.
          </p>
          <ul className="flex flex-col gap-1">
            {categoryChildren.map((childId) => {
              const child = structure.items[childId];
              if (!child) return null;
              return (
                <li key={childId} className="rounded-md border border-[var(--line)] px-2 py-1 text-sm text-[var(--ink-2)]">
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

function Stepper({
  label,
  value,
  onChange,
  infinite,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  infinite?: boolean;
}) {
  const isInfinite = value === null;
  const decrement = () => onChange(isInfinite ? 0 : Math.max(0, value - 1));
  const increment = () => onChange(isInfinite ? 0 : value + 1);

  return (
    <div className="flex items-center gap-1">
      <span className="font-mono text-[11px] uppercase text-[var(--ink-3)]">{label}</span>
      <div className="flex items-center overflow-hidden rounded-full border border-[var(--line)] bg-[var(--panel)]">
        <button type="button" onClick={decrement} className="h-6 w-6 text-sm text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]">
          −
        </button>
        <span className="w-8 text-center font-mono text-xs text-[var(--ink)]">{isInfinite ? "∞" : value}</span>
        <button type="button" onClick={increment} className="h-6 w-6 text-sm text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]">
          +
        </button>
      </div>
      {infinite && (
        <button
          type="button"
          onClick={() => onChange(isInfinite ? 1 : null)}
          title="Ei ylärajaa"
          className={`h-6 w-6 rounded-full text-xs transition ${
            isInfinite ? "bg-[var(--accent-soft)] text-[var(--ink)] outline outline-1 outline-[var(--accent-line)]" : "text-[var(--ink-3)] hover:bg-[var(--panel-2)]"
          }`}
        >
          ∞
        </button>
      )}
    </div>
  );
}
