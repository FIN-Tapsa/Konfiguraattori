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
import { AppControls } from "./AppControls";

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
    <div className="mx-auto max-w-3xl">
      <header
        className="mx-[18px] mt-[18px] max-[700px]:mx-3 max-[700px]:mt-3 flex min-h-[60px] flex-wrap items-center gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--panel)] px-[18px] py-[11px] shadow-[var(--shadow)]"
      >
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight text-[var(--ink)]">Tuoterakenteet</h1>
          <p className="text-sm text-[var(--ink-2)]">
            Mallinna hierarkkisia tuoterakenteita ja simuloi myyntikonfiguraattorin toimintaa niiden pohjalta.
          </p>
        </div>
        <AppControls />
      </header>

      <div className="m-[18px] max-[700px]:m-3 flex flex-col gap-[18px] max-[700px]:gap-3">
        {!isFirebaseConfigured && (
          <div className="rounded-[14px] border border-[var(--accent-line)] bg-[var(--accent-soft)] p-3 text-sm text-[var(--ink)]">
            Firebase ei ole konfiguroitu (.env puuttuu tai on vaillinainen). Tallennus Firestoreen ei ole käytössä -
            voit silti kokeilla työkalua avaamalla sen ilman tallennusta. Katso README.md.
          </div>
        )}
        {error && (
          <div className="rounded-[14px] border border-[var(--warn)] bg-[var(--warn-soft)] p-3 text-sm text-[var(--ink)]">{error}</div>
        )}

        <div className="rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-[18px] shadow-[var(--shadow)]">
          <div className="mb-5 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--on-accent)] transition hover:opacity-90"
              onClick={() => setPending({ type: "create", template: createEmptyStructure("Uusi tuoterakenne") })}
            >
              + Uusi tyhjä rakenne
            </button>
            <button
              type="button"
              className="rounded-lg border border-[var(--line-2)] px-3 py-2 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--panel-2)]"
              onClick={() => setPending({ type: "create", template: buildSampleStructure() })}
            >
              + Uusi esimerkkidatalla
            </button>
          </div>

          {loading && <p className="text-sm text-[var(--ink-3)]">Ladataan...</p>}

          <ul className="flex flex-col gap-2">
            {structures.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-[var(--ink)]">{s.name}</p>
                  <p className="font-mono text-xs text-[var(--ink-3)]">
                    {s.itemCount} nimikettä{s.updatedAt ? ` · päivitetty ${new Date(s.updatedAt).toLocaleString("fi-FI")}` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busyId === s.id}
                  className="rounded-lg bg-[var(--accent)] px-2 py-1 text-xs font-medium text-[var(--on-accent)] transition hover:opacity-90 disabled:opacity-50"
                  onClick={() => handleOpen(s.id)}
                >
                  Avaa
                </button>
                <button
                  type="button"
                  disabled={busyId === s.id}
                  className="rounded-lg border border-[var(--line-2)] px-2 py-1 text-xs text-[var(--ink)] transition hover:bg-[var(--panel)] disabled:opacity-50"
                  onClick={() => setPending({ type: "duplicate", id: s.id, currentName: s.name })}
                >
                  Tallenna nimellä
                </button>
                <button
                  type="button"
                  disabled={busyId === s.id}
                  className="rounded-lg border border-[var(--warn)] px-2 py-1 text-xs text-[var(--warn)] transition hover:bg-[var(--warn-soft)] disabled:opacity-50"
                  onClick={() => setPending({ type: "delete", id: s.id, name: s.name })}
                >
                  Poista
                </button>
              </li>
            ))}
            {!loading && isFirebaseConfigured && structures.length === 0 && (
              <p className="text-sm text-[var(--ink-3)]">Ei tallennettuja rakenteita vielä.</p>
            )}
          </ul>
        </div>
      </div>

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
