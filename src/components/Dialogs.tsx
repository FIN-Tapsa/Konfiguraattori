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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]"
      >
        <h3 className="mb-3 text-sm font-semibold text-[var(--ink)]">{title}</h3>
        {label && <label className="mb-0.5 block text-xs text-[var(--ink-2)]">{label}</label>}
        <input
          type="text"
          autoFocus
          className="mb-4 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-sm text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]"
            onClick={onCancel}
          >
            Peruuta
          </button>
          <button
            type="submit"
            className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-sm font-medium text-[var(--on-accent)] transition hover:opacity-90 disabled:opacity-50"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--shadow)]">
        <h3 className="mb-2 text-sm font-semibold text-[var(--ink)]">{title}</h3>
        <p className="mb-4 text-sm text-[var(--ink-2)]">{message}</p>
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-sm text-[var(--ink-2)] transition hover:bg-[var(--panel-2)]"
            onClick={onCancel}
          >
            Peruuta
          </button>
          <button
            type="button"
            className={`rounded-lg px-3 py-1.5 text-sm font-medium text-[var(--on-accent)] transition hover:opacity-90 ${
              danger ? "bg-[var(--warn)]" : "bg-[var(--accent)]"
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
