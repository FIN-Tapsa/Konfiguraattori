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
    <div className="flex h-screen w-screen items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-xs rounded border border-slate-300 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-lg font-semibold text-slate-800">Tuoterakennekonfiguraattori</h1>
        <p className="mb-4 text-sm text-slate-500">Sivu on suojattu salasanalla.</p>
        <input
          type="password"
          autoFocus
          className="mb-2 w-full rounded border border-slate-300 px-3 py-2 text-sm"
          placeholder="Salasana"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError(false);
          }}
        />
        {error && <p className="mb-2 text-sm text-red-600">Väärä salasana.</p>}
        <button type="submit" className="w-full rounded bg-sky-600 px-3 py-2 text-sm font-medium text-white hover:bg-sky-700">
          Kirjaudu
        </button>
      </form>
    </div>
  );
}
