import { useState } from "react";
import type { ProductStructure } from "./types";
import { StructureList } from "./components/StructureList";
import { Workspace } from "./components/Workspace";

export default function App() {
  const [openStructure, setOpenStructure] = useState<ProductStructure | null>(null);

  return (
    <div className="h-screen w-screen overflow-hidden bg-slate-100">
      {openStructure ? (
        <Workspace
          key={openStructure.id}
          initial={openStructure}
          onBackToList={() => setOpenStructure(null)}
        />
      ) : (
        <div className="h-full overflow-auto">
          <StructureList onOpen={setOpenStructure} />
        </div>
      )}
    </div>
  );
}
