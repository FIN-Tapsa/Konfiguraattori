// Lightweight front-door password prompt. This is NOT real access control -
// since there is no backend, the configured password is baked into the
// public JS bundle like any other client-side value and can be read by
// anyone who inspects it. It only deters casual visitors from poking around;
// it does not protect the Firestore/Storage data itself (see the security
// notes in firestore.rules / storage.rules and the Firebase Auth extension
// point in src/firebase/config.ts for actual protection).

import { useState, type FormEvent, type ReactNode } from "react";

const STORAGE_KEY = "konfiguraattori-auth-ok";
const configuredPassword = import.meta.env.VITE_APP_PASSWORD;

function isUnlockedInStorage(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function PasswordGate({ children }: { children: ReactNode }) {
  // No password configured -> gate is disabled entirely (e.g. local dev without .env).
  const [unlocked, setUnlocked] = useState(() => !configuredPassword || isUnlockedInStorage());
  const [input, setInput] = useState("");
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (input === configuredPassword) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        // localStorage unavailable (esim. yksityinen selaus) - pysyy avoinna vain tämän istunnon ajan.
      }
      setUnlocked(true);
    } else {
      setError(true);
    }
  };

  return (
    <div className="flex h-screen w-screen items-center justify-center p-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xs rounded-[20px] border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--shadow)]"
      >
        <h1 className="mb-1 text-lg font-semibold text-[var(--ink)]">Tuoterakennekonfiguraattori</h1>
        <p className="mb-4 text-sm text-[var(--ink-2)]">Sivu on suojattu salasanalla.</p>
        <input
          type="password"
          autoFocus
          className="mb-2 w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          placeholder="Salasana"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(false);
          }}
        />
        {error && <p className="mb-2 text-sm text-[var(--warn)]">Väärä salasana.</p>}
        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--on-accent)] transition hover:opacity-90"
        >
          Kirjaudu
        </button>
      </form>
    </div>
  );
}
