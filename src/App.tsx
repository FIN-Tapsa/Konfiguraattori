import { useState } from "react";
import type { ProductStructure } from "./types";
import { StructureList } from "./components/StructureList";
import { Workspace } from "./components/Workspace";
import { PasswordGate } from "./components/PasswordGate";
import { AnimatedBackground } from "./components/AnimatedBackground";
import { useBackgroundEnabled } from "./hooks/useBackgroundEnabled";

export default function App() {
  const [openStructure, setOpenStructure] = useState<ProductStructure | null>(null);
  const { enabled: backgroundEnabled } = useBackgroundEnabled();

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[var(--bg)] text-[var(--ink)]">
      <AnimatedBackground enabled={backgroundEnabled} />
      <div className="relative z-10 h-full">
        <PasswordGate>
          {openStructure ? (
            <Workspace key={openStructure.id} initial={openStructure} onBackToList={() => setOpenStructure(null)} />
          ) : (
            <div className="h-full overflow-auto">
              <StructureList onOpen={setOpenStructure} />
            </div>
          )}
        </PasswordGate>
      </div>
    </div>
  );
}
