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

export async function uploadItemImage(structureId: string, itemId: string, file: File): Promise<string> {
  const storageInstance = requireStorage();
  const path = `structures/${structureId}/items/${itemId}/${Date.now()}_${file.name}`;
  const fileRef = ref(storageInstance, path);
  await uploadBytes(fileRef, file);
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
