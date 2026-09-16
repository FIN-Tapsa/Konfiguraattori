// Uploads item images straight into the user's own Google Drive folder from
// the browser, via Google Identity Services (GIS) OAuth - an alternative to
// Firebase Storage for people who don't want to enable Blaze billing.
//
// One-time setup required in Google Cloud Console (same project as Firebase
// works fine, it's the same underlying GCP project): enable the Drive API,
// configure the OAuth consent screen, create a Web OAuth client id with the
// app's origins authorized. See README "Google Drive kuvien tallennukseen".
//
// Scope is the narrow `drive.file` scope: the app can only see/manage files
// it itself creates, not the user's whole Drive.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID;
const FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
const SCOPE = "https://www.googleapis.com/auth/drive.file";

export const isDriveConfigured = Boolean(CLIENT_ID && FOLDER_ID);

// Minimal ambient typing for the GIS script - no official types package used
// here to keep this a zero-dependency integration.
interface GisTokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
}
interface GisTokenClient {
  requestAccessToken: (opts?: { prompt?: string }) => void;
}
declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: GisTokenResponse) => void;
            error_callback?: (error: { type?: string }) => void;
          }) => GisTokenClient;
        };
      };
    };
  }
}

let gisScriptPromise: Promise<void> | null = null;
function loadGisScript(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;
  gisScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Google Identity Services -skriptin lataus epäonnistui."));
    document.head.appendChild(script);
  });
  return gisScriptPromise;
}

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (!CLIENT_ID) {
    throw new Error("Google Drive ei ole konfiguroitu (VITE_GOOGLE_DRIVE_CLIENT_ID puuttuu).");
  }
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) {
    return cachedToken.value;
  }
  await loadGisScript();
  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error(`Google-kirjautuminen epäonnistui: ${response.error ?? "tuntematon virhe"}`));
          return;
        }
        cachedToken = { value: response.access_token, expiresAt: Date.now() + response.expires_in * 1000 };
        resolve(response.access_token);
      },
      error_callback: (err) => {
        reject(new Error(`Google-kirjautuminen epäonnistui tai peruttiin: ${err?.type ?? "tuntematon virhe"}`));
      },
    });
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

export async function uploadImageToDrive(file: File): Promise<string> {
  if (!FOLDER_ID) {
    throw new Error("Google Drive ei ole konfiguroitu (VITE_GOOGLE_DRIVE_FOLDER_ID puuttuu).");
  }
  const token = await getAccessToken();

  const metadata = { name: `${Date.now()}_${file.name}`, parents: [FOLDER_ID] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);

  const uploadResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!uploadResponse.ok) {
    throw new Error(`Kuvan lataus Google Driveen epäonnistui (HTTP ${uploadResponse.status}).`);
  }
  const { id } = (await uploadResponse.json()) as { id: string };

  // Explicitly make the file link-viewable, regardless of whether the target
  // folder's own sharing settings cascade to files created via the API.
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${id}/permissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "reader", type: "anyone" }),
    });
  } catch {
    // Non-fatal: file is uploaded either way, it just might not be public yet.
  }

  return `https://drive.google.com/thumbnail?id=${id}&sz=w1000`;
}
