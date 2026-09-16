import { useState } from "react";
import type { ProductStructure } from "../../types";
import { computeDerivedState, createInitialSelection, getGroupStatuses, toggleSelection } from "../../domain/simulation";
import { SimulationNode } from "./SimulationNode";
import { SummaryPanel } from "./SummaryPanel";
import { AppControls } from "../AppControls";

interface SimulationViewProps {
  structure: ProductStructure;
  onBackToEditor: () => void;
}

/** Tally how many of the currently reachable selection groups are satisfied, for the progress bar. */
function countGroupProgress(structure: ProductStructure, selected: Set<string>): { total: number; done: number } {
  let total = 0;
  let done = 0;
  const seen = new Set<string>();
  const visit = (parentId: string) => {
    if (seen.has(parentId)) return;
    seen.add(parentId);
    for (const status of getGroupStatuses(structure, selected, parentId)) {
      total += 1;
      if (status.satisfied) done += 1;
      for (const memberId of status.group.memberItemIds) {
        if (selected.has(memberId) && structure.items[memberId]?.type === "assembly") visit(memberId);
      }
    }
    for (const childId of structure.items[parentId]?.children ?? []) {
      if (selected.has(childId) && structure.items[childId]?.type === "category") visit(childId);
    }
  };
  visit(structure.rootItemId);
  return { total, done };
}

export function SimulationView({ structure, onBackToEditor }: SimulationViewProps) {
  const [selected, setSelected] = useState<Set<string>>(() => createInitialSelection(structure));

  const derived = computeDerivedState(structure, selected);
  const progress = countGroupProgress(structure, selected);

  const handleToggle = (itemId: string) => {
    setSelected((prev) => toggleSelection(structure, prev, itemId));
  };

  const handleReset = () => setSelected(createInitialSelection(structure));

  const root = structure.items[structure.rootItemId];

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="mx-[18px] mt-[18px] flex min-h-[60px] flex-wrap items-center gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--panel)] px-[18px] py-[11px] shadow-[var(--shadow)]">
        <button
          type="button"
          className="shrink-0 text-sm text-[var(--ink-2)] transition hover:text-[var(--ink)]"
          onClick={onBackToEditor}
        >
          ← Takaisin rakennustilaan
        </button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-[var(--ink)]">Simulointi: {structure.name}</h1>
        <AppControls />
      </header>

      <div className="grid flex-1 grid-cols-[minmax(0,1fr)_minmax(320px,372px)] gap-[18px] overflow-auto p-[18px] max-[1100px]:grid-cols-1">
        <div className="min-h-0 rounded-[20px] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow)]">
          <div className="image-placeholder flex h-[340px] w-full items-center justify-center rounded-t-[20px]">
            {root?.imageUrl ? (
              <img src={root.imageUrl} alt="" className="h-full w-full rounded-t-[20px] object-cover" />
            ) : (
              <span className="font-mono text-sm text-[var(--ink-3)]">{root?.code || "TUOTEKUVA"}</span>
            )}
          </div>
          <div className="border-b border-[var(--line)] px-5 py-3">
            <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--ink-2)]">
              <span>Valinnat</span>
              <span className="font-mono">
                {progress.done}/{progress.total} valintaa tehty
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--sunk)]">
              <div
                className="h-full rounded-full bg-[var(--accent)] transition-[width] duration-300"
                style={{ width: progress.total > 0 ? `${(progress.done / progress.total) * 100}%` : "100%" }}
              />
            </div>
          </div>
          <div className="p-5">
            <p className="mb-4 text-sm text-[var(--ink-2)]">
              {root?.description || "Käy läpi valinnat kuten myyntikonfiguraattorissa."}
            </p>
            <SimulationNode
              structure={structure}
              parentItemId={structure.rootItemId}
              selected={selected}
              effects={derived.effects}
              onToggle={handleToggle}
              depth={0}
            />
          </div>
        </div>
        <div className="min-h-0 rounded-[20px] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow)]">
          <SummaryPanel derived={derived} onReset={handleReset} />
        </div>
      </div>
    </div>
  );
}
