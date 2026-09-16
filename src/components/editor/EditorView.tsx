import { useState } from "react";
import type { ItemType } from "../../types";
import type { ProductStructureController } from "../../state/useProductStructure";
import { Outliner } from "./Outliner";
import { ItemPanel } from "./ItemPanel";
import { GroupsEditor } from "./GroupsEditor";
import { RulesEditor } from "./RulesEditor";
import { ValidationPanel } from "./ValidationPanel";
import { ImportExportBar } from "./ImportExportBar";

type Tab = "item" | "groups" | "rules";

interface EditorViewProps {
  controller: ProductStructureController;
  onSave: () => void;
  saving: boolean;
  onBack: () => void;
  onEnterSimulation: () => void;
}

export function EditorView({ controller, onSave, saving, onBack, onEnterSimulation }: EditorViewProps) {
  const { structure, issues, isDirty } = controller;
  const [selectedItemId, setSelectedItemId] = useState<string>(structure.rootItemId);
  const [tab, setTab] = useState<Tab>("item");
  const [addingParentId, setAddingParentId] = useState<string | null>(null);

  const selectedItem = structure.items[selectedItemId] ?? structure.items[structure.rootItemId];

  const handleSelect = (itemId: string) => {
    setSelectedItemId(itemId);
    setTab("item");
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-2">
        <button type="button" className="text-sm text-slate-500 hover:text-slate-800" onClick={onBack}>
          ← Rakenteet
        </button>
        <input
          type="text"
          className="min-w-0 flex-1 rounded border border-transparent px-2 py-1 text-lg font-semibold hover:border-slate-300 focus:border-slate-300"
          value={structure.name}
          onChange={(e) => controller.replaceStructure({ ...structure, name: e.target.value })}
        />
        {isDirty && <span className="text-xs text-amber-600">Tallentamattomia muutoksia</span>}
        <button
          type="button"
          className="rounded bg-emerald-600 px-3 py-1 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? "Tallennetaan..." : "Tallenna"}
        </button>
        <button
          type="button"
          className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white hover:bg-sky-700"
          onClick={onEnterSimulation}
        >
          ▶ Simuloi
        </button>
        <ImportExportBar structure={structure} onImported={(s) => controller.replaceStructure({ ...s, id: structure.id })} />
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[280px_1fr_320px]">
        <div className="min-h-0 overflow-hidden border-r border-slate-200 bg-white">
          <Outliner
            structure={structure}
            selectedItemId={selectedItemId}
            onSelect={handleSelect}
            onReparent={controller.reparentItem}
            onAddChild={(parentId) => setAddingParentId(parentId)}
            onDelete={(id) => {
              if (id === selectedItemId) setSelectedItemId(structure.rootItemId);
              controller.deleteItem(id);
            }}
            issues={issues}
          />
        </div>

        <div className="min-h-0 overflow-auto bg-slate-50 p-4">
          <div className="mb-3 flex gap-1 border-b border-slate-200">
            <TabButton active={tab === "item"} onClick={() => setTab("item")}>
              Nimike
            </TabButton>
            {(selectedItem.type === "assembly" || selectedItem.type === "category") && (
              <TabButton active={tab === "groups"} onClick={() => setTab("groups")}>
                Ryhmät
              </TabButton>
            )}
            <TabButton active={tab === "rules"} onClick={() => setTab("rules")}>
              Säännöt
            </TabButton>
          </div>

          {tab === "item" && (
            <ItemPanel
              key={selectedItem.id}
              item={selectedItem}
              structureId={structure.id}
              onChange={(changes) => controller.updateItem(selectedItem.id, changes)}
            />
          )}
          {tab === "groups" && (selectedItem.type === "assembly" || selectedItem.type === "category") && (
            <GroupsEditor
              structure={structure}
              parentItemId={selectedItem.id}
              onAddGroup={controller.addGroup}
              onUpdateGroup={controller.updateGroup}
              onDeleteGroup={controller.deleteGroup}
              onUpdateItemRequired={(itemId, required) => controller.updateItem(itemId, { required })}
            />
          )}
          {tab === "rules" && (
            <RulesEditor structure={structure} onAdd={controller.addRule} onUpdate={controller.updateRule} onDelete={controller.deleteRule} />
          )}
        </div>

        <div className="min-h-0 overflow-hidden border-l border-slate-200 bg-white">
          <ValidationPanel issues={issues} onFocusItem={handleSelect} />
        </div>
      </div>

      {addingParentId && (
        <AddItemDialog
          onCancel={() => setAddingParentId(null)}
          onConfirm={(name, type) => {
            const id = controller.addItem(addingParentId, { name, type });
            setAddingParentId(null);
            setSelectedItemId(id);
            setTab("item");
          }}
        />
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className={`-mb-px border-b-2 px-3 py-1.5 text-sm font-medium ${
        active ? "border-sky-600 text-sky-700" : "border-transparent text-slate-500 hover:text-slate-800"
      }`}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

function AddItemDialog({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: (name: string, type: ItemType) => void;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<ItemType>("single");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded bg-white p-4 shadow-xl">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">Uusi nimike</h3>
        <label className="mb-0.5 block text-xs text-slate-500">Nimi</label>
        <input
          type="text"
          autoFocus
          className="mb-3 w-full rounded border border-slate-300 px-2 py-1 text-sm"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="mb-0.5 block text-xs text-slate-500">Tyyppi</label>
        <select
          className="mb-4 w-full rounded border border-slate-300 px-2 py-1 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value as ItemType)}
        >
          <option value="single">Yksittäinen nimike</option>
          <option value="assembly">Kokoonpano</option>
          <option value="category">Väliotsikko</option>
        </select>
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100" onClick={onCancel}>
            Peruuta
          </button>
          <button
            type="button"
            className="rounded bg-sky-600 px-3 py-1 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
            disabled={!name.trim()}
            onClick={() => onConfirm(name.trim(), type)}
          >
            Lisää
          </button>
        </div>
      </div>
    </div>
  );
}
