// Google Apps Script web app: saves images posted by the configurator into ONE
// Drive folder, running as the folder's owner. Deploy as "Web app", Execute as
// "Me", Who has access "Anyone". See README "Kuvien lataus ilman kirjautumista".
//
// The script can only touch FOLDER_ID; nothing else in the owner's Drive is
// reachable through it. SECRET is only a speed bump against random bots: it is
// also in the public JS bundle, so do not treat it as real authentication.

const FOLDER_ID = "PASTE_DRIVE_FOLDER_ID_HERE";
const SECRET = "PASTE_A_LONG_RANDOM_STRING_HERE";
const MAX_BYTES = 8 * 1024 * 1024;

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.secret !== SECRET) return respond({ ok: false, error: "unauthorized" });
    if (!/^image\//.test(req.mimeType || "")) return respond({ ok: false, error: "vain kuvatiedostot sallittu" });

    const bytes = Utilities.base64Decode(req.data || "");
    if (bytes.length === 0) return respond({ ok: false, error: "tyhjä tiedosto" });
    if (bytes.length > MAX_BYTES) return respond({ ok: false, error: "kuva on liian suuri (max 8 MB)" });

    const safeName = String(req.name || "kuva").replace(/[^\w.\-]+/g, "_").slice(0, 80);
    const blob = Utilities.newBlob(bytes, req.mimeType, Date.now() + "_" + safeName);
    const file = DriveApp.getFolderById(FOLDER_ID).createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return respond({ ok: true, id: file.getId() });
  } catch (err) {
    return respond({ ok: false, error: String(err) });
  }
}

function respond(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
