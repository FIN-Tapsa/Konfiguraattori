import { useState } from "react";
import type { ItemType } from "../../types";
import type { ProductStructureController } from "../../state/useProductStructure";
import { getParentId } from "../../domain/tree";
import { Outliner } from "./Outliner";
import { ItemPanel } from "./ItemPanel";
import { GroupsEditor } from "./GroupsEditor";
import { RulesEditor } from "./RulesEditor";
import { ValidationPanel } from "./ValidationPanel";
import { ImportExportBar } from "./ImportExportBar";
import { AppControls } from "../AppControls";

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
  const [addingParentId, setAddingParentId] = useState<string | null>(null);
  const [showValidation, setShowValidation] = useState(false);

  const selectedItem = structure.items[selectedItemId] ?? structure.items[structure.rootItemId];

  const breadcrumb: { id: string; name: string }[] = [];
  {
    let current: string | undefined = selectedItem.id;
    const seen = new Set<string>();
    while (current && !seen.has(current)) {
      seen.add(current);
      const item = structure.items[current];
      if (!item) break;
      breadcrumb.unshift({ id: item.id, name: item.name || "(nimetön)" });
      current = getParentId(structure, current);
    }
  }

  const errorCount = issues.filter((i) => i.level === "error").length;

  const handleSelect = (itemId: string) => {
    setSelectedItemId(itemId);
  };

  const canHaveGroups = selectedItem.type === "assembly" || selectedItem.type === "category";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <header className="mx-[18px] mt-[18px] flex min-h-[60px] flex-wrap items-center gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--panel)] px-[18px] py-[11px] shadow-[var(--shadow)]">
        <button
          type="button"
          className="shrink-0 text-sm text-[var(--ink-2)] transition hover:text-[var(--ink)]"
          onClick={onBack}
        >
          ← Rakenteet
        </button>
        <input
          type="text"
          className="min-w-0 flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1 text-lg font-semibold text-[var(--ink)] outline-none transition hover:border-[var(--line)] focus:border-[var(--accent)] focus:bg-[var(--panel-2)]"
          value={structure.name}
          onChange={(e) => controller.replaceStructure({ ...structure, name: e.target.value })}
        />
        {isDirty && <span className="shrink-0 text-xs text-[var(--warn)]">Tallentamattomia muutoksia</span>}
        {issues.length > 0 && (
          <button
            type="button"
            onClick={() => setShowValidation((v) => !v)}
            className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition ${
              errorCount > 0
                ? "border-[var(--warn)] bg-[var(--warn-soft)] text-[var(--warn)]"
                : "border-[var(--accent-line)] bg-[var(--accent-soft)] text-[var(--ink)]"
            }`}
          >
            {issues.length} huomiota
          </button>
        )}
        <button
          type="button"
          className="shrink-0 rounded-lg bg-[var(--accent-soft)] px-3 py-1.5 text-sm font-medium text-[var(--ink)] transition hover:opacity-90 disabled:opacity-50"
          disabled={saving}
          onClick={onSave}
        >
          {saving ? "Tallennetaan..." : "Tallenna"}
        </button>
        <button
          type="button"
          className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--on-accent)] transition hover:opacity-90"
          onClick={onEnterSimulation}
        >
          ▶ Simuloi
        </button>
        <ImportExportBar structure={structure} onImported={(s) => controller.replaceStructure({ ...s, id: structure.id })} />
        <AppControls />
      </header>

      <div className="grid flex-1 grid-cols-[minmax(224px,288px)_minmax(0,1fr)_minmax(300px,336px)] gap-[18px] overflow-auto p-[18px] max-[1100px]:grid-cols-[minmax(224px,288px)_minmax(0,1fr)]">

        <div className="min-h-0 rounded-[20px] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow)]">
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

        <div className="min-h-0 rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--shadow)]">
          <nav className="mb-3 truncate font-mono text-xs text-[var(--ink-3)]">
            {breadcrumb.map((crumb, idx) => (
              <span key={crumb.id}>
                {idx > 0 && <span className="mx-1">/</span>}
                <button
                  type="button"
                  className="transition hover:text-[var(--ink)]"
                  onClick={() => handleSelect(crumb.id)}
                >
                  {crumb.name}
                </button>
              </span>
            ))}
          </nav>
          <ItemPanel
            key={selectedItem.id}
            item={selectedItem}
            structureId={structure.id}
            onChange={(changes) => controller.updateItem(selectedItem.id, changes)}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-[18px] max-[1100px]:col-span-full">
          {showValidation && (
            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel)] shadow-[var(--shadow)]">
              <ValidationPanel issues={issues} onFocusItem={handleSelect} />
            </div>
          )}

          {canHaveGroups && (
            <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
              <GroupsEditor
                structure={structure}
                parentItemId={selectedItem.id}
                onAddGroup={controller.addGroup}
                onUpdateGroup={controller.updateGroup}
                onDeleteGroup={controller.deleteGroup}
                onUpdateItemRequired={(itemId, required) => controller.updateItem(itemId, { required })}
              />
            </div>
          )}

          <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
            <RulesEditor
              structure={structure}
              onAdd={controller.addRule}
              onUpdate={controller.updateRule}
              onDelete={controller.deleteRule}
              focusItemId={selectedItem.id}
            />
          </div>
        </div>
      </div>

      {addingParentId && (
        <AddItemDialog
          onCancel={() => setAddingParentId(null)}
          onConfirm={(name, type) => {
            const id = controller.addItem(addingParentId, { name, type });
            setAddingParentId(null);
            setSelectedItemId(id);
          }}
        />
      )}
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
        <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">Uusi nimike</h3>
        <label className="mb-0.5 block text-xs text-[var(--ink-2)]">Nimi</label>
        <input
          type="text"
          autoFocus
          className="mb-3 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label className="mb-0.5 block text-xs text-[var(--ink-2)]">Tyyppi</label>
        <select
          className="mb-4 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)]"
          value={type}
          onChange={(e) => setType(e.target.value as ItemType)}
        >
          <option value="single">Yksittäinen nimike</option>
          <option value="assembly">Kokoonpano</option>
          <option value="category">Väliotsikko</option>
        </select>
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded-lg px-3 py-1.5 text-sm text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]" onClick={onCancel}>
            Peruuta
          </button>
          <button
            type="button"
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--on-accent)] transition hover:opacity-90 disabled:opacity-50"
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
