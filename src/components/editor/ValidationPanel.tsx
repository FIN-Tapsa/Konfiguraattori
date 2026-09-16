import type { ValidationIssue } from "../../types";

interface ValidationPanelProps {
  issues: ValidationIssue[];
  onFocusItem?: (itemId: string) => void;
}

export function ValidationPanel({ issues, onFocusItem }: ValidationPanelProps) {
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  return (
    <div className="flex flex-col">
      <div className="border-b border-[var(--line)] px-4 py-3">
        <h2 className="text-sm font-semibold text-[var(--ink)]">
          Validointi{" "}
          {issues.length === 0 ? (
            <span className="font-normal text-[var(--accent-line)]">✓ Ei huomautuksia</span>
          ) : (
            <span className="font-normal text-[var(--ink-3)]">
              ({errors.length} virhettä, {warnings.length} huomiota)
            </span>
          )}
        </h2>
      </div>
      <ul className="flex flex-col gap-1 p-3 text-sm">
        {errors.map((issue, idx) => (
          <li key={`e${idx}`} className="rounded-lg bg-[var(--warn-soft)] px-2 py-1.5 text-[var(--warn)]">
            <button type="button" className="text-left" onClick={() => issue.itemId && onFocusItem?.(issue.itemId)}>
              ⛔ {issue.message}
            </button>
          </li>
        ))}
        {warnings.map((issue, idx) => (
          <li key={`w${idx}`} className="rounded-lg bg-[var(--accent-soft)] px-2 py-1.5 text-[var(--ink)]">
            <button type="button" className="text-left" onClick={() => issue.itemId && onFocusItem?.(issue.itemId)}>
              ⚠ {issue.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
