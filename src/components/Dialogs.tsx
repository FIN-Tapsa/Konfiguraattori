// Small in-app replacements for window.prompt()/window.confirm(). Native
// browser dialogs are unreliable - most browsers offer a "prevent this page
// from creating additional dialogs" checkbox that silently makes prompt()
// return null forever afterwards, which looked like the app "doing nothing".

import { useState, type FormEvent, type ReactNode } from "react";

interface PromptDialogProps {
  title: string;
  label?: string;
  defaultValue?: string;
  confirmLabel?: string;
  onConfirm: (value: string) => void;
  onCancel: () => void;
}

export function PromptDialog({ title, label, defaultValue = "", confirmLabel = "OK", onConfirm, onCancel }: PromptDialogProps) {
  const [value, setValue] = useState(defaultValue);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!value.trim()) return;
    onConfirm(value.trim());
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded bg-white p-4 shadow-xl">
        <h3 className="mb-3 text-sm font-semibold text-slate-700">{title}</h3>
        {label && <label className="mb-0.5 block text-xs text-slate-500">{label}</label>}
        <input
          type="text"
          autoFocus
          className="mb-4 w-full rounded border border-slate-300 px-2 py-1 text-sm"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100" onClick={onCancel}>
            Peruuta
          </button>
          <button
            type="submit"
            className="rounded bg-sky-600 px-3 py-1 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
            disabled={!value.trim()}
          >
            {confirmLabel}
          </button>
        </div>
      </form>
    </div>
  );
}

interface ConfirmDialogProps {
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ title, message, confirmLabel = "Vahvista", danger, onConfirm, onCancel }: ConfirmDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded bg-white p-4 shadow-xl">
        <h3 className="mb-2 text-sm font-semibold text-slate-700">{title}</h3>
        <p className="mb-4 text-sm text-slate-600">{message}</p>
        <div className="flex justify-end gap-2">
          <button type="button" className="rounded px-3 py-1 text-sm text-slate-600 hover:bg-slate-100" onClick={onCancel}>
            Peruuta
          </button>
          <button
            type="button"
            className={`rounded px-3 py-1 text-sm text-white ${danger ? "bg-red-600 hover:bg-red-700" : "bg-sky-600 hover:bg-sky-700"}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
