import { useRef, useState } from "react";
import type { ProductStructure } from "../../types";
import { exportToWorkbook, importFromFile, type ImportError } from "../../domain/excel";

interface ImportExportBarProps {
  structure: ProductStructure;
  onImported: (structure: ProductStructure) => void;
}

export function ImportExportBar({ structure, onImported }: ImportExportBarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<ImportError[] | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileSelected = async (file: File) => {
    setImporting(true);
    setErrors(null);
    try {
      const result = await importFromFile(file, structure.name);
      if (result.success) {
        onImported(result.structure);
      } else {
        setErrors(result.errors);
      }
    } catch (e) {
      setErrors([{ sheet: "-", row: 0, message: e instanceof Error ? e.message : "Tuonti epäonnistui." }]);
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className="rounded-lg border border-[var(--line-2)] px-2 py-1.5 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--panel-2)]"
        onClick={() => exportToWorkbook(structure)}
      >
        ⬇ Vie Exceliin
      </button>
      <button
        type="button"
        className="rounded-lg border border-[var(--line-2)] px-2 py-1.5 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--panel-2)] disabled:opacity-50"
        disabled={importing}
        onClick={() => fileInputRef.current?.click()}
      >
        {importing ? "Tuodaan..." : "⬆ Tuo Excelistä"}
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelected(file);
        }}
      />

      {errors && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
            <h3 className="mb-2 text-sm font-semibold text-[var(--warn)]">
              Tuonti epäonnistui ({errors.length} virhettä). Rakennetta ei muutettu.
            </h3>
            <ul className="flex flex-col gap-1 text-sm">
              {errors.map((err, idx) => (
                <li key={idx} className="rounded-lg bg-[var(--warn-soft)] px-2 py-1.5 text-[var(--ink)]">
                  <span className="font-mono text-xs text-[var(--ink-3)]">
                    [{err.sheet}
                    {err.row ? `, rivi ${err.row}` : ""}]
                  </span>{" "}
                  {err.message}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--on-accent)] transition hover:opacity-90"
              onClick={() => setErrors(null)}
            >
              Sulje
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
