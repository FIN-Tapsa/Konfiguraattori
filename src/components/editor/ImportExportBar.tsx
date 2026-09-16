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
        className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
        onClick={() => exportToWorkbook(structure)}
      >
        ⬇ Vie Exceliin
      </button>
      <button
        type="button"
        className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-auto rounded bg-white p-4 shadow-xl">
            <h3 className="mb-2 text-sm font-semibold text-red-700">
              Tuonti epäonnistui ({errors.length} virhettä). Rakennetta ei muutettu.
            </h3>
            <ul className="flex flex-col gap-1 text-sm">
              {errors.map((err, idx) => (
                <li key={idx} className="rounded bg-red-50 px-2 py-1">
                  <span className="font-mono text-xs text-slate-500">
                    [{err.sheet}{err.row ? `, rivi ${err.row}` : ""}]
                  </span>{" "}
                  {err.message}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-3 rounded bg-slate-700 px-3 py-1 text-sm text-white hover:bg-slate-800"
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
