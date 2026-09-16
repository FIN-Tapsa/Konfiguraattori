// Recursively renders the selection controls for one active assembly's
// children, and (for any selected assembly child) its own nested controls.

import type { ProductStructure } from "../../types";
import { getGroupStatuses } from "../../domain/simulation";
import type { RuleEffects } from "../../domain/simulation";

interface SimulationNodeProps {
  structure: ProductStructure;
  parentItemId: string;
  selected: Set<string>;
  effects: RuleEffects;
  onToggle: (itemId: string) => void;
  depth: number;
}

export function SimulationNode({ structure, parentItemId, selected, effects, onToggle, depth }: SimulationNodeProps) {
  const groupStatuses = getGroupStatuses(structure, selected, parentItemId);

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0 }} className="flex flex-col gap-3">
      {groupStatuses.map(({ group, controlType, selectedCount, satisfied }) => (
        <fieldset key={group.id} className="rounded border border-slate-200 p-3">
          <legend className="flex items-center gap-2 px-1 text-sm font-medium text-slate-700">
            {group.implicit ? null : group.name}
            {group.min > 0 && <span className="text-xs font-normal text-red-600">pakollinen</span>}
            {!satisfied && (
              <span className="text-xs font-normal text-amber-600">
                (valitse {group.max === null ? `vähintään ${group.min}` : group.min === group.max ? `${group.min} kpl` : `${group.min}-${group.max} kpl`}, nyt {selectedCount})
              </span>
            )}
          </legend>
          <div className="flex flex-col gap-1">
            {group.memberItemIds.map((memberId) => {
              const item = structure.items[memberId];
              if (!item) return null;
              const isSelected = selected.has(memberId);
              const isLocked = effects.locked.has(memberId);
              const isDisabled = effects.disabledExcluded.has(memberId);
              // Capacity only blocks picking MORE items once a multi-select group (max > 1)
              // is full. A max=1 checkbox group instead allows clicking a new option to
              // switch the selection (toggleSelection deselects the previous one for us).
              const atCapacity =
                !isSelected && group.max !== null && group.max > 1 && selectedCount >= group.max && controlType === "checkbox";

              return (
                <div key={memberId}>
                  <label
                    className={`flex items-center gap-2 rounded px-1 py-0.5 text-sm ${
                      isDisabled ? "text-slate-400" : "cursor-pointer hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type={controlType}
                      name={group.id}
                      checked={isSelected}
                      disabled={isDisabled || isLocked || atCapacity}
                      onChange={() => onToggle(memberId)}
                    />
                    <span>{item.name}</span>
                    {item.price ? <span className="text-xs text-slate-400">+{item.price.toLocaleString("fi-FI")} €</span> : null}
                    {isLocked && <span className="text-xs text-sky-600">🔒 pakotettu</span>}
                  </label>
                  {isDisabled && (
                    <p className="ml-6 text-xs text-red-500">{effects.disabledExcluded.get(memberId)?.join(", ")}</p>
                  )}
                  {isLocked && !isDisabled && (
                    <p className="ml-6 text-xs text-sky-500">{effects.locked.get(memberId)?.join(", ")}</p>
                  )}
                  {isSelected && item.type === "assembly" && (
                    <div className="mt-2 border-l-2 border-slate-100 pl-3">
                      <SimulationNode
                        structure={structure}
                        parentItemId={memberId}
                        selected={selected}
                        effects={effects}
                        onToggle={onToggle}
                        depth={depth + 1}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
