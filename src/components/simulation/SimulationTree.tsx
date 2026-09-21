// Alternative presentation of the simulation: a compact hierarchical tree of
// choices (radio/checkbox rows) instead of the card grid. Same engine state as
// SimulationNode - only the rendering differs. Branches open under the
// selected assembly, väliotsikot act as always-open branches.

import type { ProductStructure } from "../../types";
import { getGroupStatuses, type GroupStatus, type RuleEffects } from "../../domain/simulation";

interface SimulationTreeProps {
  structure: ProductStructure;
  parentItemId: string;
  selected: Set<string>;
  effects: RuleEffects;
  onToggle: (itemId: string) => void;
}

export function SimulationTree({ structure, parentItemId, selected, effects, onToggle }: SimulationTreeProps) {
  const parent = structure.items[parentItemId];
  if (!parent) return null;

  const statusByMember = new Map<string, GroupStatus>();
  for (const status of getGroupStatuses(structure, selected, parentItemId)) {
    for (const memberId of status.group.memberItemIds) statusByMember.set(memberId, status);
  }

  const rendered = new Set<string>();
  const blocks: React.ReactNode[] = [];

  for (const childId of parent.children) {
    const child = structure.items[childId];
    if (!child || rendered.has(childId)) continue;

    if (child.type === "category") {
      rendered.add(childId);
      if (!selected.has(childId)) continue;
      blocks.push(
        <div key={childId} className="basis-full">
          <p className="flex items-center gap-1.5 py-1 text-sm font-semibold text-[var(--ink-2)]">
            <span aria-hidden="true">📁</span>
            {child.name}
          </p>
          <div className="ml-2 border-l border-[var(--line-2)] pl-3">
            <SimulationTree structure={structure} parentItemId={childId} selected={selected} effects={effects} onToggle={onToggle} />
          </div>
        </div>,
      );
      continue;
    }

    const status = statusByMember.get(childId);
    if (!status) continue;
    const { group, controlType, selectedCount, satisfied } = status;
    group.memberItemIds.forEach((m) => rendered.add(m));

    blocks.push(
      <fieldset key={group.id} className="min-w-0 flex-[1_1_300px]">
        {(!group.implicit || !satisfied) && (
          <legend className="flex flex-wrap items-center gap-2 px-0 pb-0.5 text-xs text-[var(--ink-3)]">
            {group.implicit ? null : <span className="font-medium text-[var(--ink-2)]">{group.name}</span>}
            {group.min > 0 && (
              <span className="rounded-full bg-[var(--warn-soft)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--warn)]">pakollinen</span>
            )}
            {!satisfied && (
              <span className="font-mono">
                valitse {group.max === null ? `vähintään ${group.min}` : group.min === group.max ? `${group.min} kpl` : `${group.min}-${group.max} kpl`}, nyt {selectedCount}
              </span>
            )}
          </legend>
        )}
        <ul className="flex flex-col">
          {group.memberItemIds.map((memberId) => {
            const item = structure.items[memberId];
            if (!item) return null;
            const isSelected = selected.has(memberId);
            const isLocked = effects.locked.has(memberId);
            const isDisabled = effects.disabledExcluded.has(memberId);
            const atCapacity =
              !isSelected && group.max !== null && group.max > 1 && selectedCount >= group.max && controlType === "checkbox";
            const inactive = isDisabled || isLocked || atCapacity;

            return (
              <li key={memberId}>
                <label
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition ${
                    isDisabled ? "cursor-not-allowed opacity-55" : inactive ? "cursor-default" : "cursor-pointer hover:bg-[var(--panel-2)]"
                  } ${isSelected ? "bg-[var(--accent-soft)]" : ""}`}
                >
                  <input
                    type={controlType}
                    name={group.id}
                    className="shrink-0 accent-[var(--accent)]"
                    checked={isSelected}
                    disabled={inactive}
                    onChange={() => onToggle(memberId)}
                  />
                  {item.color && (
                    <span className="h-3 w-3 shrink-0 rounded-full border border-black/10" style={{ backgroundColor: item.color }} aria-hidden="true" />
                  )}
                  <span className="min-w-0 flex-1 truncate text-[var(--ink)]">{item.name}</span>
                  {item.code && <span className="hidden shrink-0 font-mono text-[11px] text-[var(--ink-3)] sm:inline">{item.code}</span>}
                  {isLocked && <span title="Pakollinen sääntöjen takia">🔒</span>}
                  {item.price ? (
                    <span className="shrink-0 font-mono text-xs text-[var(--ink-3)]">+{item.price.toLocaleString("fi-FI")} €</span>
                  ) : null}
                </label>
                {isDisabled && (
                  <p className="px-2 pb-1 pl-8 text-xs text-[var(--warn)]">Ei yhdistettävissä: {effects.disabledExcluded.get(memberId)?.join(", ")}</p>
                )}
                {isLocked && !isDisabled && (
                  <p className="px-2 pb-1 pl-8 text-xs text-[var(--ink-3)]">Pakollinen valinnan kanssa: {effects.locked.get(memberId)?.join(", ")}</p>
                )}
                {isSelected && item.type === "assembly" && item.children.length > 0 && (
                  <div className="ml-4 border-l border-[var(--line-2)] pl-3">
                    <SimulationTree structure={structure} parentItemId={memberId} selected={selected} effects={effects} onToggle={onToggle} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </fieldset>,
    );
  }

  // Parallel groups sit side by side; väliotsikot (basis-full) start a new row.
  return <div className="flex flex-wrap items-start gap-x-4 gap-y-2">{blocks}</div>;
}
