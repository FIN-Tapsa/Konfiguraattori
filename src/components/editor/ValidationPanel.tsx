import type { ValidationIssue } from "../../types";

interface ValidationPanelProps {
  issues: ValidationIssue[];
  onFocusItem?: (itemId: string) => void;
}

export function ValidationPanel({ issues, onFocusItem }: ValidationPanelProps) {
  const errors = issues.filter((i) => i.level === "error");
  const warnings = issues.filter((i) => i.level === "warning");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200 px-3 py-2">
        <h2 className="text-sm font-semibold text-slate-700">
          Validointi{" "}
          {issues.length === 0 ? (
            <span className="text-emerald-600">✓ Ei huomautuksia</span>
          ) : (
            <span className="text-slate-500">
              ({errors.length} virhettä, {warnings.length} huomiota)
            </span>
          )}
        </h2>
      </div>
      <ul className="flex-1 overflow-auto p-2 text-sm">
        {errors.map((issue, idx) => (
          <li key={`e${idx}`} className="mb-1 rounded bg-red-50 px-2 py-1 text-red-700">
            <button
              type="button"
              className="text-left"
              onClick={() => issue.itemId && onFocusItem?.(issue.itemId)}
            >
              ⛔ {issue.message}
            </button>
          </li>
        ))}
        {warnings.map((issue, idx) => (
          <li key={`w${idx}`} className="mb-1 rounded bg-amber-50 px-2 py-1 text-amber-700">
            <button
              type="button"
              className="text-left"
              onClick={() => issue.itemId && onFocusItem?.(issue.itemId)}
            >
              ⚠ {issue.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
