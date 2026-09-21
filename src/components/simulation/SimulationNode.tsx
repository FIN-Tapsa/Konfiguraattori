// Recursively renders the selection controls for one active assembly's
// children as a card grid, and (for any selected assembly child) its own
// nested controls. Category children render as a plain heading with their
// own children shown right below - see domain/simulation.ts activateCategories.

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
  /** How many väliotsikko levels deep this node is (0 = directly under an assembly). */
  headingLevel?: number;
}

// Sub-headings get progressively quieter so nested väliotsikot read as a hierarchy.
const HEADING_STYLES = [
  "mb-2 border-b border-[var(--line-2)] pb-1 text-sm font-semibold text-[var(--ink-2)]",
  "mb-2 text-[13px] font-semibold text-[var(--ink-2)]",
  "mb-2 font-mono text-[11px] font-medium uppercase tracking-wide text-[var(--ink-3)]",
];

export function SimulationNode({ structure, parentItemId, selected, effects, onToggle, depth, headingLevel = 0 }: SimulationNodeProps) {
  const groupStatuses = getGroupStatuses(structure, selected, parentItemId);
  const parent = structure.items[parentItemId];
  const categoryChildIds = parent?.children.filter((id) => structure.items[id]?.type === "category") ?? [];

  return (
    <div style={{ marginLeft: depth > 0 ? 16 : 0 }} className="flex flex-col gap-4">
      {/* Parallel groups at the same level sit side by side and wrap when there is no room. */}
      <div className="flex flex-wrap items-start gap-4">
      {groupStatuses.map(({ group, controlType, selectedCount, satisfied }) => (
        <fieldset key={group.id} className="min-w-0 flex-[1_1_440px] rounded-[14px] border border-[var(--line)] p-3">
          <legend className="flex flex-wrap items-center gap-2 px-1 text-sm font-medium text-[var(--ink)]">
            {group.implicit ? null : group.name}
            {group.min > 0 && (
              <span className="rounded-full bg-[var(--warn-soft)] px-2 py-0.5 text-[10px] font-medium text-[var(--warn)]">
                pakollinen
              </span>
            )}
            {!satisfied && (
              <span className="font-mono text-xs font-normal text-[var(--ink-3)]">
                valitse {group.max === null ? `vähintään ${group.min}` : group.min === group.max ? `${group.min} kpl` : `${group.min}-${group.max} kpl`}, nyt {selectedCount}
              </span>
            )}
          </legend>
          <div className="grid gap-[11px]" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))" }}>
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
                <div key={memberId} className="flex flex-col">
                  <button
                    type="button"
                    disabled={inactive}
                    onClick={() => onToggle(memberId)}
                    className={[
                      "flex flex-col overflow-hidden rounded-[14px] border text-left transition",
                      isSelected
                        ? "border-[var(--accent)] shadow-[0_0_0_3px_var(--accent-soft)]"
                        : "border-[var(--line)] hover:border-[var(--line-2)]",
                      isDisabled ? "cursor-not-allowed opacity-55" : inactive ? "cursor-default" : "cursor-pointer",
                    ].join(" ")}
                  >
                    <div className="image-placeholder relative flex h-24 w-full items-center justify-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span className="font-mono text-[10px] text-[var(--ink-3)]">{item.code || "EI KUVAA"}</span>
                      )}
                      <span
                        className={`absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-xs transition ${
                          isSelected
                            ? "bg-[var(--accent)] text-[var(--on-accent)]"
                            : "border border-[var(--line-2)] bg-[var(--panel)] text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                      {isLocked && (
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-[var(--panel)]/90 px-1.5 py-0.5 text-[10px] text-[var(--ink-2)]">
                          🔒
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2 px-2.5 py-2">
                      <span className="min-w-0 truncate text-sm text-[var(--ink)]">{item.name}</span>
                      {item.price ? (
                        <span className="shrink-0 font-mono text-xs text-[var(--ink-3)]">+{item.price.toLocaleString("fi-FI")} €</span>
                      ) : null}
                    </div>
                  </button>
                  {isDisabled && (
                    <p className="mt-1 px-1 text-xs text-[var(--warn)]">
                      Ei yhdistettävissä: {effects.disabledExcluded.get(memberId)?.join(", ")}
                    </p>
                  )}
                  {isLocked && !isDisabled && (
                    <p className="mt-1 px-1 text-xs text-[var(--ink-3)]">
                      Pakollinen valinnan kanssa: {effects.locked.get(memberId)?.join(", ")}
                    </p>
                  )}
                  {isSelected && item.type === "assembly" && (
                    <div className="mt-2">
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
      {categoryChildIds.map((categoryId) => {
        const category = structure.items[categoryId];
        if (!category || !selected.has(categoryId)) return null;
        const Heading = `h${Math.min(headingLevel + 4, 6)}` as "h4" | "h5" | "h6";
        return (
          <div key={categoryId} className={headingLevel > 0 ? "border-l-2 border-[var(--line)] pl-3" : ""}>
            <Heading className={HEADING_STYLES[Math.min(headingLevel, HEADING_STYLES.length - 1)]}>{category.name}</Heading>
            <SimulationNode
              structure={structure}
              parentItemId={categoryId}
              selected={selected}
              effects={effects}
              onToggle={onToggle}
              depth={depth}
              headingLevel={headingLevel + 1}
            />
          </div>
        );
      })}
    </div>
  );
}
