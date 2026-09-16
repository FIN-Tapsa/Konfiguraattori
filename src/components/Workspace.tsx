// Hosts one opened ProductStructure: owns its editing state and switches
// between the editor (rakennustila) and the simulation (esikatselu) mode.

import { useState } from "react";
import type { ProductStructure } from "../types";
import { useProductStructure } from "../state/useProductStructure";
import { EditorView } from "./editor/EditorView";
import { SimulationView } from "./simulation/SimulationView";
import { isFirebaseConfigured } from "../firebase/config";
import { saveStructure } from "../firebase/structures";

interface WorkspaceProps {
  initial: ProductStructure;
  onBackToList: () => void;
}

export function Workspace({ initial, onBackToList }: WorkspaceProps) {
  const controller = useProductStructure(initial);
  const [mode, setMode] = useState<"editor" | "simulation">("editor");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!isFirebaseConfigured) {
      setSaveError("Firebase ei ole konfiguroitu - rakennetta ei voi tallentaa. Katso README.md.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await saveStructure(controller.structure);
      controller.markSaved(controller.structure);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "Tallennus epäonnistui.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex h-full flex-col">
      {saveError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-1 text-sm text-red-700">{saveError}</div>
      )}
      {mode === "editor" ? (
        <EditorView
          controller={controller}
          onSave={handleSave}
          saving={saving}
          onBack={onBackToList}
          onEnterSimulation={() => setMode("simulation")}
        />
      ) : (
        <SimulationView structure={controller.structure} onBackToEditor={() => setMode("editor")} />
      )}
    </div>
  );
}
