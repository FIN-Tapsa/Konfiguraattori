// List of saved product structures: open, duplicate ("save as"), delete, or
// create a new one (blank or from the fictional sample).

import { useEffect, useState } from "react";
import type { ProductStructureSummary } from "../types";
import { createEmptyStructure } from "../domain/tree";
import { buildSampleStructure } from "../domain/sampleData";
import { isFirebaseConfigured } from "../firebase/config";
import * as store from "../firebase/structures";
import type { ProductStructure } from "../types";
import { ConfirmDialog, PromptDialog } from "./Dialogs";

interface StructureListProps {
  onOpen: (structure: ProductStructure) => void;
}

type PendingAction =
  | { type: "create"; template: ProductStructure }
  | { type: "duplicate"; id: string; currentName: string }
  | { type: "delete"; id: string; name: string };

export function StructureList({ onOpen }: StructureListProps) {
  const [structures, setStructures] = useState<ProductStructureSummary[]>([]);
  const [loading, setLoading] = useState(isFirebaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction | null>(null);

  const refresh = async () => {
    if (!isFirebaseConfigured) return;
    setLoading(true);
    setError(null);
    try {
      setStructures(await store.listStructures());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rakenteiden lataus epäonnistui.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const handleCreate = async (template: ProductStructure, name: string) => {
    const structure = { ...template, name };
    if (isFirebaseConfigured) {
      try {
        await store.saveStructure(structure);
        await refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Tallennus epäonnistui.");
      }
    }
    onOpen(structure);
  };

  const handleOpen = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      const structure = await store.loadStructure(id);
      onOpen(structure);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Avaaminen epäonnistui.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDuplicate = async (id: string, name: string) => {
    setBusyId(id);
    setError(null);
    try {
      const source = await store.loadStructure(id);
      const copy = await store.duplicateStructure(source, name);
      await refresh();
      onOpen(copy);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kopiointi epäonnistui.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await store.deleteStructure(id);
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Poisto epäonnistui.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="mb-1 text-2xl font-bold">Tuoterakenteet</h1>
      <p className="mb-4 text-sm text-slate-500">
        Mallinna hierarkkisia tuoterakenteita ja simuloi myyntikonfiguraattorin toimintaa niiden pohjalta.
      </p>

      {!isFirebaseConfigured && (
        <div className="mb-4 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          Firebase ei ole konfiguroitu (.env puuttuu tai on vaillinainen). Tallennus Firestoreen ei ole käytössä -
          voit silti kokeilla työkalua avaamalla sen ilman tallennusta. Katso README.md.
        </div>
      )}
      {error && <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          className="rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700"
          onClick={() => setPending({ type: "create", template: createEmptyStructure("Uusi tuoterakenne") })}
        >
          + Uusi tyhjä rakenne
        </button>
        <button
          type="button"
          className="rounded border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
          onClick={() => setPending({ type: "create", template: buildSampleStructure() })}
        >
          + Uusi esimerkkidatalla
        </button>
      </div>

      {loading && <p className="text-sm text-slate-400">Ladataan...</p>}

      <ul className="flex flex-col gap-2">
        {structures.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded border border-slate-200 bg-white px-3 py-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{s.name}</p>
              <p className="text-xs text-slate-400">
                {s.itemCount} nimikettä{s.updatedAt ? ` · päivitetty ${new Date(s.updatedAt).toLocaleString("fi-FI")}` : ""}
              </p>
            </div>
            <button
              type="button"
              disabled={busyId === s.id}
              className="rounded bg-sky-600 px-2 py-1 text-xs font-medium text-white hover:bg-sky-700 disabled:opacity-50"
              onClick={() => handleOpen(s.id)}
            >
              Avaa
            </button>
            <button
              type="button"
              disabled={busyId === s.id}
              className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              onClick={() => setPending({ type: "duplicate", id: s.id, currentName: s.name })}
            >
              Tallenna nimellä
            </button>
            <button
              type="button"
              disabled={busyId === s.id}
              className="rounded border border-red-300 px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-50"
              onClick={() => setPending({ type: "delete", id: s.id, name: s.name })}
            >
              Poista
            </button>
          </li>
        ))}
        {!loading && isFirebaseConfigured && structures.length === 0 && (
          <p className="text-sm text-slate-400">Ei tallennettuja rakenteita vielä.</p>
        )}
      </ul>

      {pending?.type === "create" && (
        <PromptDialog
          title="Uusi tuoterakenne"
          label="Nimi"
          defaultValue={pending.template.name}
          confirmLabel="Luo"
          onCancel={() => setPending(null)}
          onConfirm={(name) => {
            const template = pending.template;
            setPending(null);
            handleCreate(template, name);
          }}
        />
      )}
      {pending?.type === "duplicate" && (
        <PromptDialog
          title="Tallenna nimellä"
          label="Uusi nimi"
          defaultValue={`${pending.currentName} (kopio)`}
          confirmLabel="Tallenna"
          onCancel={() => setPending(null)}
          onConfirm={(name) => {
            const id = pending.id;
            setPending(null);
            handleDuplicate(id, name);
          }}
        />
      )}
      {pending?.type === "delete" && (
        <ConfirmDialog
          title="Poista tuoterakenne"
          message={`Poistetaanko tuoterakenne "${pending.name}" pysyvästi?`}
          confirmLabel="Poista"
          danger
          onCancel={() => setPending(null)}
          onConfirm={() => {
            const id = pending.id;
            setPending(null);
            handleDelete(id);
          }}
        />
      )}
    </div>
  );
}
