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
//
// Alternative without any Google sign-in for the uploader: a small Google Apps
// Script web app (apps-script/upload.gs) that runs as the folder's owner and
// saves posted images into that one folder. Set VITE_DRIVE_UPLOAD_URL to use
// it; the OAuth flow below is then not used at all.
//
// The sign-in popup MUST be opened synchronously from a click handler
// (connectDrive), otherwise browsers block it. So sign-in is its own button
// and the GIS script is preloaded, instead of signing in lazily on upload.

const CLIENT_ID = import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID;
const FOLDER_ID = import.meta.env.VITE_GOOGLE_DRIVE_FOLDER_ID;
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const APP_FOLDER_NAME = "Konfiguraattori-kuvat";

const UPLOAD_URL = import.meta.env.VITE_DRIVE_UPLOAD_URL;
const UPLOAD_SECRET = import.meta.env.VITE_DRIVE_UPLOAD_SECRET;

/** True when uploads go through the Apps Script web app (no Google sign-in needed). */
export const isDriveUploadProxy = Boolean(UPLOAD_URL);
export const isDriveConfigured = isDriveUploadProxy || Boolean(CLIENT_ID && FOLDER_ID);

/** Error with a user-facing message plus a list of concrete things to try. */
export class DriveError extends Error {
  hints: string[];
  constructor(message: string, hints: string[] = []) {
    super(message);
    this.name = "DriveError";
    this.hints = hints;
  }
}

// Minimal ambient typing for the GIS script - no official types package used
// here to keep this a zero-dependency integration.
interface GisTokenResponse {
  access_token: string;
  expires_in: number;
  error?: string;
  error_description?: string;
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
            error_callback?: (error: { type?: string; message?: string }) => void;
          }) => GisTokenClient;
        };
      };
    };
  }
}

const isGisLoaded = () => Boolean(window.google?.accounts?.oauth2);

let gisScriptPromise: Promise<void> | null = null;
function loadGisScript(): Promise<void> {
  if (isGisLoaded()) return Promise.resolve();
  if (gisScriptPromise) return gisScriptPromise;
  gisScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisScriptPromise = null;
      script.remove();
      reject(
        new DriveError("Googlen kirjautumiskirjaston (accounts.google.com/gsi/client) lataus epäonnistui.", [
          "Tarkista verkkoyhteys.",
          "Mainosesto tai tietosuojalaajennus voi estää accounts.google.com -osoitteen - kokeile ilman sitä.",
        ]),
      );
    };
    document.head.appendChild(script);
  });
  return gisScriptPromise;
}

/** Call early (e.g. when the image panel mounts) so the script is ready at click time. */
export function preloadDriveScript(): void {
  loadGisScript().catch(() => {});
}

let cachedToken: { value: string; expiresAt: number } | null = null;

export function hasDriveToken(): boolean {
  return Boolean(cachedToken && cachedToken.expiresAt > Date.now() + 5000);
}

function popupClosedError(): DriveError {
  return new DriveError("Google-kirjautumisikkuna sulkeutui ennen kuin kirjautuminen valmistui (popup_closed).", [
    'Jos suljit ikkunan itse: paina "Kirjaudu Google Driveen" uudelleen ja jätä ikkuna auki, kunnes se sulkeutuu itsestään.',
    `Jos ikkunassa näkyi virhe (esim. "origin_mismatch" tai "access_denied"), syy on Google Cloud -asetuksissa: sovelluksen osoite ${window.location.origin} pitää olla täsmälleen OAuth-clientin Authorized JavaScript origins -listassa (ei polkua, ei loppukauttaviivaa), ja jos OAuth consent screen on Testing-tilassa, Google-tilisi pitää olla Test users -listalla.`,
    "Jos ikkuna sulkeutui itsestään hyväksynnän jälkeen, selain tai laajennus (mainosesto, tietosuojalaajennus, kolmansien osapuolten evästeiden esto) voi estää ikkunaa palauttamasta vastausta - kokeile ilman laajennuksia tai toisella selaimella.",
  ]);
}

function gisCallbackError(response: GisTokenResponse): DriveError {
  const code = response.error ?? "tuntematon virhe";
  if (code === "access_denied") {
    return new DriveError("Pääsy Google Driveen evättiin (access_denied).", [
      "Hyväksy kaikki pyydetyt käyttöoikeudet (rastita Drive-ruutu) ja yritä uudelleen.",
      "Jos consent screen on Testing-tilassa, Google-tilisi pitää olla Test users -listalla (Google Cloud Console -> APIs & Services -> OAuth consent screen).",
    ]);
  }
  return new DriveError(`Google-kirjautuminen epäonnistui: ${code}${response.error_description ? ` (${response.error_description})` : ""}.`, [
    "Yritä uudelleen. Jos virhe toistuu, tarkista OAuth-clientin asetukset Google Cloud Consolessa.",
  ]);
}

/**
 * Opens the Google sign-in/consent popup. Must be called synchronously from a
 * user click (no await before it), otherwise the browser blocks the popup.
 */
export function connectDrive(): Promise<void> {
  if (!CLIENT_ID) {
    return Promise.reject(new DriveError("Google Drive ei ole konfiguroitu (VITE_GOOGLE_DRIVE_CLIENT_ID puuttuu)."));
  }
  if (hasDriveToken()) return Promise.resolve();
  if (!isGisLoaded()) {
    // Not ready yet; a click after this is synchronous again.
    preloadDriveScript();
    return Promise.reject(
      new DriveError("Googlen kirjautumiskirjasto latautuu vielä.", ["Odota hetki ja paina painiketta uudelleen."]),
    );
  }
  return new Promise((resolve, reject) => {
    const tokenClient = window.google!.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          console.error("[Google Drive] token callback error", response);
          reject(gisCallbackError(response));
          return;
        }
        cachedToken = { value: response.access_token, expiresAt: Date.now() + response.expires_in * 1000 };
        resolve();
      },
      error_callback: (err) => {
        console.error("[Google Drive] GIS error_callback", err);
        if (err?.type === "popup_failed_to_open") {
          reject(
            new DriveError("Selain esti Google-kirjautumisikkunan (popup_failed_to_open).", [
              "Salli ponnahdusikkunat tälle sivulle (ikoni osoiterivin oikeassa reunassa) ja paina painiketta uudelleen.",
            ]),
          );
        } else if (err?.type === "popup_closed") {
          reject(popupClosedError());
        } else {
          reject(
            new DriveError(`Google-kirjautuminen epäonnistui: ${err?.type ?? "tuntematon virhe"}.`, [
              "Yritä uudelleen. Selaimen konsolissa (F12) on tarkempi virheilmoitus.",
            ]),
          );
        }
      },
    });
    tokenClient.requestAccessToken({ prompt: "" });
  });
}

async function httpError(response: Response, action: string): Promise<DriveError> {
  let reason = "";
  let detail = "";
  try {
    const body = (await response.json()) as { error?: { message?: string; errors?: { reason?: string }[] } };
    reason = body.error?.errors?.[0]?.reason ?? "";
    detail = body.error?.message ?? "";
  } catch {
    // Body wasn't JSON; status code alone will do.
  }
  const suffix = detail ? ` - ${detail}` : "";
  if (response.status === 401) {
    cachedToken = null;
    return new DriveError(`Google-istunto on vanhentunut (HTTP 401).`, ['Paina "Kirjaudu Google Driveen" ja yritä uudelleen.']);
  }
  if (response.status === 403) {
    if (reason === "accessNotConfigured" || /has not been used|is disabled/i.test(detail)) {
      return new DriveError(`Google Drive API ei ole käytössä Google Cloud -projektissa (HTTP 403).${suffix}`, [
        "Google Cloud Console -> APIs & Services -> Library -> hae 'Google Drive API' -> Enable (samassa projektissa, johon OAuth client kuuluu).",
      ]);
    }
    return new DriveError(`${action} epäonnistui: ei oikeutta (HTTP 403${reason ? `, ${reason}` : ""}).${suffix}`, [
      "Varmista, että hyväksyit Drive-käyttöoikeuden kirjautuessa (scope drive.file), ja että Drive API on otettu käyttöön projektissa.",
    ]);
  }
  return new DriveError(`${action} epäonnistui (HTTP ${response.status}).${suffix}`);
}

async function postFile(token: string, file: File, folderId: string): Promise<Response> {
  const metadata = { name: `${Date.now()}_${file.name}`, parents: [folderId] };
  const form = new FormData();
  form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
  form.append("file", file);
  return fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
}

// drive.file only lets the app write into folders it created itself, so a
// user-made folder (VITE_GOOGLE_DRIVE_FOLDER_ID) can answer 404. Fall back to
// a folder the app owns; the same OAuth client can find it again by name.
async function getOrCreateAppFolder(token: string): Promise<string> {
  const headers = { Authorization: `Bearer ${token}` };
  const q = encodeURIComponent(
    `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
  );
  const list = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`, { headers });
  if (!list.ok) throw await httpError(list, "Kansion haku Google Drivesta");
  const found = ((await list.json()) as { files?: { id: string }[] }).files?.[0]?.id;
  if (found) return found;

  const create = await fetch("https://www.googleapis.com/drive/v3/files?fields=id", {
    method: "POST",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ name: APP_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  });
  if (!create.ok) throw await httpError(create, "Kansion luonti Google Driveen");
  return ((await create.json()) as { id: string }).id;
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
    reader.onerror = () => reject(new DriveError("Tiedoston lukeminen epäonnistui."));
    reader.readAsDataURL(file);
  });
}

async function uploadViaProxy(file: File): Promise<string> {
  const data = await fileToBase64(file);
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 90_000);
  let response: Response;
  try {
    // text/plain keeps this a "simple" request, so the browser sends no CORS preflight (Apps Script cannot answer one).
    response = await fetch(UPLOAD_URL!, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({ secret: UPLOAD_SECRET ?? "", name: file.name, mimeType: file.type || "application/octet-stream", data }),
      signal: controller.signal,
    });
  } catch {
    throw new DriveError("Yhteys latauspalveluun (Apps Script) epäonnistui tai aikakatkaistiin.", [
      "Tarkista verkkoyhteys ja että VITE_DRIVE_UPLOAD_URL on oikea (päättyy /exec).",
      "Suuret kuvat voivat kestää: kokeile pienempää kuvaa.",
    ]);
  } finally {
    window.clearTimeout(timer);
  }

  let result: { ok?: boolean; id?: string; error?: string };
  try {
    result = await response.json();
  } catch {
    throw new DriveError("Latauspalvelu ei palauttanut odotettua vastausta.", [
      'Apps Script -julkaisun "Who has access" -asetuksen pitää olla "Anyone" ja "Execute as" -asetuksen "Me".',
      "Muutettuasi skriptiä julkaise uusi versio (Deploy -> Manage deployments -> Edit -> New version).",
    ]);
  }
  if (!result.ok || !result.id) {
    throw new DriveError(
      `Latauspalvelu hylkäsi kuvan: ${result.error ?? "tuntematon virhe"}.`,
      result.error === "unauthorized"
        ? ["VITE_DRIVE_UPLOAD_SECRET ei vastaa skriptin SECRET-arvoa."]
        : [],
    );
  }
  return `https://drive.google.com/thumbnail?id=${result.id}&sz=w1000`;
}

export async function uploadImageToDrive(file: File): Promise<string> {
  if (isDriveUploadProxy) return uploadViaProxy(file);
  if (!hasDriveToken()) {
    throw new DriveError("Et ole kirjautunut Google Driveen.", ['Paina "Kirjaudu Google Driveen" ja yritä uudelleen.']);
  }
  const token = cachedToken!.value;

  let uploadResponse = FOLDER_ID ? await postFile(token, file, FOLDER_ID) : null;
  if (!uploadResponse || uploadResponse.status === 404) {
    uploadResponse = await postFile(token, file, await getOrCreateAppFolder(token));
  }
  if (!uploadResponse.ok) throw await httpError(uploadResponse, "Kuvan lataus Google Driveen");
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
