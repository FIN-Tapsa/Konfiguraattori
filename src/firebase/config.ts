// Firebase app initialization. All values come from environment variables so
// no project-specific configuration is committed to the repository.
// See README.md for how to create a Firebase project and populate .env.

import { initializeApp, type FirebaseApp } from "firebase/app";
import { getFirestore, type Firestore } from "firebase/firestore";
import { getStorage, type FirebaseStorage } from "firebase/storage";
// Extension point for later: import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.storageBucket
);

let app: FirebaseApp | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;

if (isFirebaseConfigured) {
  app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  storage = getStorage(app);
} else {
  // eslint-disable-next-line no-console
  console.warn(
    "Firebase-konfiguraatio puuttuu tai on vaillinainen. Kopioi .env.example -> .env ja täytä oman Firebase-projektisi arvot."
  );
}

export { app, db, storage };

// Extension point for later: v1 has no authentication (personal tool, access
// restricted via Firestore/Storage security rules instead). To add
// Firebase Auth later: initialize `getAuth(app)` here, wrap the app in an
// auth provider/context, and tighten the security rules in
// firestore.rules / storage.rules to check `request.auth`.
