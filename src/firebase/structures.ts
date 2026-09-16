// Firestore persistence for ProductStructure documents. Each structure is
// stored as a single document in the "structures" collection - this keeps
// reads/writes simple (one document per configurator) and structures are
// expected to be small enough (hundreds of items) to stay well under
// Firestore's 1 MiB document size limit.

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from "firebase/firestore";
import { v4 as uuid } from "uuid";
import { db } from "./config";
import type { ProductStructure, ProductStructureSummary } from "../types";

const COLLECTION = "structures";

function requireDb() {
  if (!db) {
    throw new Error(
      "Firebase ei ole konfiguroitu. Täytä .env-tiedosto (katso .env.example ja README.md)."
    );
  }
  return db;
}

function toTimestampMillis(value: unknown): number | undefined {
  if (value instanceof Timestamp) return value.toMillis();
  if (typeof value === "number") return value;
  return undefined;
}

export async function listStructures(): Promise<ProductStructureSummary[]> {
  const database = requireDb();
  const q = query(collection(database, COLLECTION), orderBy("updatedAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => {
    const data = d.data() as ProductStructure;
    return {
      id: d.id,
      name: data.name,
      updatedAt: toTimestampMillis(data.updatedAt),
      itemCount: data.items ? Object.keys(data.items).length : 0,
    };
  });
}

export async function loadStructure(id: string): Promise<ProductStructure> {
  const database = requireDb();
  const snapshot = await getDoc(doc(database, COLLECTION, id));
  if (!snapshot.exists()) throw new Error(`Rakennetta ${id} ei löytynyt.`);
  return { ...(snapshot.data() as ProductStructure), id: snapshot.id };
}

export async function saveStructure(structure: ProductStructure): Promise<void> {
  const database = requireDb();
  await setDoc(doc(database, COLLECTION, structure.id), {
    ...structure,
    updatedAt: serverTimestamp(),
    createdAt: structure.createdAt ?? serverTimestamp(),
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
  const database = requireDb();
  await deleteDoc(doc(database, COLLECTION, id));
}
