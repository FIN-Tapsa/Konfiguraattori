/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  /** Optional: kevyt etusivun salasanasuoja. Tyhjänä salasanakysely on pois käytöstä. */
  readonly VITE_APP_PASSWORD?: string;
  /** Optional: Google Drive -kuvatallennuksen OAuth-client-id ja kohdekansion id. */
  readonly VITE_GOOGLE_DRIVE_CLIENT_ID?: string;
  readonly VITE_GOOGLE_DRIVE_FOLDER_ID?: string;
  /** Optional: Apps Script web app -osoite kuvien lataukseen ilman Google-kirjautumista (ks. apps-script/upload.gs). */
  readonly VITE_DRIVE_UPLOAD_URL?: string;
  readonly VITE_DRIVE_UPLOAD_SECRET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
