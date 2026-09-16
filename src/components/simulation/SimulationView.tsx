import { useState } from "react";
import type { ProductStructure } from "../../types";
import { computeDerivedState, createInitialSelection, toggleSelection } from "../../domain/simulation";
import { SimulationNode } from "./SimulationNode";
import { SummaryPanel } from "./SummaryPanel";

interface SimulationViewProps {
  structure: ProductStructure;
  onBackToEditor: () => void;
}

export function SimulationView({ structure, onBackToEditor }: SimulationViewProps) {
  const [selected, setSelected] = useState<Set<string>>(() => createInitialSelection(structure));

  const derived = computeDerivedState(structure, selected);

  const handleToggle = (itemId: string) => {
    setSelected((prev) => toggleSelection(structure, prev, itemId));
  };

  const handleReset = () => setSelected(createInitialSelection(structure));

  const root = structure.items[structure.rootItemId];

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <button type="button" className="text-sm text-slate-500 hover:text-slate-800" onClick={onBackToEditor}>
          ← Takaisin rakennustilaan
        </button>
        <h1 className="text-lg font-semibold">Simulointi: {structure.name}</h1>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_360px]">
        <div className="min-h-0 overflow-auto p-4">
          <p className="mb-4 text-sm text-slate-500">
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
        <div className="min-h-0 overflow-hidden border-l border-slate-200 bg-white">
          <SummaryPanel derived={derived} onReset={handleReset} />
        </div>
      </div>
    </div>
  );
}
