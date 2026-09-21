// Firestore persistence for ProductStructure documents. Each structure is
// stored as a single document in the "structures" collection - this keeps
// reads/writes simple (one document per configurator) and structures are
// expected to be small enough (hundreds of items) to stay well under
// Firestore's 1 MiB document size limit.
//
// Talks to the Firestore REST API with plain fetch instead of the Firebase JS
// SDK: the SDK's browser transport (WebChannel) can lose its session ("Unknown
// SID", HTTP 400) on some networks/frontends, which left the structure list
// stuck on "Ladataan..." and saves hanging. Plain request/response calls have
// no long-lived stream to break. Access is still governed by firestore.rules.

import { v4 as uuid } from "uuid";
import { firebaseConfig, isFirebaseConfigured } from "./config";
import type { ProductStructure, ProductStructureSummary } from "../types";

const COLLECTION = "structures";
const TIMESTAMP_FIELDS = new Set(["createdAt", "updatedAt"]);
const REQUEST_TIMEOUT_MS = 30_000;

// Firestore REST value wrappers, see https://firebase.google.com/docs/firestore/reference/rest/v1/Value
type FsValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { timestampValue: string }
  | { stringValue: string }
  | { arrayValue: { values?: FsValue[] } }
  | { mapValue: { fields?: Record<string, FsValue> } };
type FsFields = Record<string, FsValue>;
interface FsDocument {
  name: string;
  fields?: FsFields;
}

function encodeValue(value: unknown): FsValue | undefined {
  if (value === undefined) return undefined; // omitted, like ignoreUndefinedProperties
  if (value === null) return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    return Number.isInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((v) => encodeValue(v) ?? { nullValue: null }) } };
  }
  return { mapValue: { fields: encodeFields(value as Record<string, unknown>) } };
}

function encodeFields(obj: Record<string, unknown>, topLevel = false): FsFields {
  const fields: FsFields = {};
  for (const [key, value] of Object.entries(obj)) {
    const encoded =
      topLevel && TIMESTAMP_FIELDS.has(key) && typeof value === "number"
        ? { timestampValue: new Date(value).toISOString() }
        : encodeValue(value);
    if (encoded !== undefined) fields[key] = encoded;
  }
  return fields;
}

function decodeValue(value: FsValue): unknown {
  if ("nullValue" in value) return null;
  if ("booleanValue" in value) return value.booleanValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("timestampValue" in value) return Date.parse(value.timestampValue);
  if ("stringValue" in value) return value.stringValue;
  if ("arrayValue" in value) return (value.arrayValue.values ?? []).map(decodeValue);
  return decodeFields(value.mapValue.fields ?? {});
}

function decodeFields(fields: FsFields): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, decodeValue(v)]));
}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  if (!isFirebaseConfigured) {
    throw new Error("Firebase ei ole konfiguroitu. Täytä .env-tiedosto (katso .env.example ja README.md).");
  }
  const base = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/(default)/documents`;
  const sep = path.includes("?") ? "&" : "?";
  const url = `${base}${path}${sep}key=${encodeURIComponent(firebaseConfig.apiKey)}`;

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: controller.signal });
  } catch {
    throw new Error("Yhteys Firestoreen epäonnistui tai aikakatkaistiin. Tarkista verkkoyhteys ja yritä uudelleen.");
  } finally {
    window.clearTimeout(timer);
  }
  if (response.ok || response.status === 404) return response;

  let detail = "";
  try {
    detail = ((await response.json()) as { error?: { message?: string } }).error?.message ?? "";
  } catch {
    // Not JSON; the status code alone will do.
  }
  throw new Error(`Firestore-pyyntö epäonnistui (HTTP ${response.status})${detail ? `: ${detail}` : ""}`);
}

const docPath = (id: string) => `/${COLLECTION}/${encodeURIComponent(id)}`;
const idOf = (doc: FsDocument) => doc.name.slice(doc.name.lastIndexOf("/") + 1);

export async function listStructures(): Promise<ProductStructureSummary[]> {
  const summaries: ProductStructureSummary[] = [];
  let pageToken: string | undefined;
  do {
    const query = `?pageSize=100${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`;
    const response = await request(`/${COLLECTION}${query}`);
    const body = (await response.json()) as { documents?: FsDocument[]; nextPageToken?: string };
    for (const doc of body.documents ?? []) {
      const fields = doc.fields ?? {};
      const updatedAt = fields.updatedAt;
      summaries.push({
        id: idOf(doc),
        name: fields.name && "stringValue" in fields.name ? fields.name.stringValue : "",
        updatedAt: updatedAt && "timestampValue" in updatedAt ? Date.parse(updatedAt.timestampValue) : undefined,
        itemCount: fields.items && "mapValue" in fields.items ? Object.keys(fields.items.mapValue.fields ?? {}).length : 0,
      });
    }
    pageToken = body.nextPageToken;
  } while (pageToken);
  return summaries.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
}

export async function loadStructure(id: string): Promise<ProductStructure> {
  const response = await request(docPath(id));
  if (response.status === 404) throw new Error(`Rakennetta ${id} ei löytynyt.`);
  const doc = (await response.json()) as FsDocument;
  return { ...(decodeFields(doc.fields ?? {}) as unknown as ProductStructure), id: idOf(doc) };
}

export async function saveStructure(structure: ProductStructure): Promise<void> {
  const now = Date.now();
  const fields = encodeFields({ ...structure, updatedAt: now, createdAt: structure.createdAt ?? now }, true);
  // PATCH without an update mask overwrites the whole document (like setDoc),
  // so fields dropped from the structure (e.g. cleared attribute defaults) disappear too.
  await request(docPath(structure.id), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });
}

export async function createStructure(name: string, template: ProductStructure): Promise<ProductStructure> {
  const structure: ProductStructure = { ...template, id: uuid(), name };
  await saveStructure(structure);
  return structure;
}

/** Saves a full copy of an existing structure under a new id ("tallenna nimellä"). */
export async function duplicateStructure(source: ProductStructure, newName: string): Promise<ProductStructure> {
  const copy: ProductStructure = {
    ...source,
    id: uuid(),
    name: newName,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  await saveStructure(copy);
  return copy;
}

export async function deleteStructure(id: string): Promise<void> {
  await request(docPath(id), { method: "DELETE" });
}
