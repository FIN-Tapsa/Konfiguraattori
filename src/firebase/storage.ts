// Firebase Storage helpers for item images/icons.

import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "./config";

function requireStorage() {
  if (!storage) {
    throw new Error(
      "Firebase Storage ei ole konfiguroitu. Täytä .env-tiedosto (katso .env.example ja README.md)."
    );
  }
  return storage;
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

export async function uploadItemImage(structureId: string, itemId: string, file: File): Promise<string> {
  const storageInstance = requireStorage();
  const path = `structures/${structureId}/items/${itemId}/${Date.now()}_${file.name}`;
  const fileRef = ref(storageInstance, path);
  // uploadBytes retries transient/network errors with backoff, which can make
  // a misconfigured bucket (not created, wrong rules, ...) look like it hangs
  // forever instead of failing. Fail fast with a clear message instead.
  await withTimeout(
    uploadBytes(fileRef, file),
    20000,
    "Kuvan lataus aikakatkaistiin (20s). Tarkista että Firebase Storage on luotu ja että storage.rules on julkaistu."
  );
  return getDownloadURL(fileRef);
}

export async function deleteItemImageByUrl(url: string): Promise<void> {
  const storageInstance = requireStorage();
  try {
    const fileRef = ref(storageInstance, url);
    await deleteObject(fileRef);
  } catch {
    // Image may already be gone or the URL may not be a storage ref; ignore.
  }
}
