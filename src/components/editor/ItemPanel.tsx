// Edit panel for a single selected item: name/type header with an animated
// image preview, pricing, image source, and generic attributes.

import { useEffect, useState } from "react";
import type { Item, ItemType, PricingMode } from "../../types";
import { AttributesEditor } from "./AttributesEditor";
import { uploadItemImage } from "../../firebase/storage";
import { isFirebaseConfigured } from "../../firebase/config";
import {
  DriveError,
  connectDrive,
  hasDriveToken,
  isDriveConfigured,
  isDriveUploadProxy,
  preloadDriveScript,
  uploadImageToDrive,
} from "../../google/drive";

interface ItemPanelProps {
  item: Item;
  structureId: string;
  isRoot: boolean;
  attributeDefaults: Record<string, string>;
  attributeKeys: string[];
  onSetAttributeDefault: (key: string, value: string) => void;
  onChange: (changes: Partial<Item>) => void;
  onDefaultChange: (defaultSelected: boolean) => void;
}

// Image upload (Google Drive / Firebase Storage) is switched off for now; only
// pasting an image URL is offered. Set to true to bring the upload box back.
const IMAGE_UPLOAD_ENABLED = false;

const TYPE_LABELS: Record<ItemType, string> = {
  single: "Yksittäinen nimike",
  assembly: "Kokoonpano",
  category: "Väliotsikko",
};
const PRICING_LABELS: Record<PricingMode, string> = {
  sumOfChildren: "Lasten hintojen summa",
  fixed: "Kiinteä hinta",
};

export function ItemPanel({
  item,
  structureId,
  isRoot,
  attributeDefaults,
  attributeKeys,
  onSetAttributeDefault,
  onChange,
  onDefaultChange,
}: ItemPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<{ message: string; hints: string[] } | null>(null);
  const [driveConnected, setDriveConnected] = useState(() => isDriveUploadProxy || hasDriveToken());
  const [typeChangeError, setTypeChangeError] = useState<string | null>(null);
  const [imageExpanded, setImageExpanded] = useState(true);

  const handleTypeChange = (type: ItemType) => {
    if (type === "single" && item.children.length > 0) {
      setTypeChangeError("Kokoonpanoa, jolla on lapsinimikkeitä, ei voi muuttaa yksittäiseksi nimikkeeksi.");
      return;
    }
    setTypeChangeError(null);
    onChange({ type, pricingMode: type === "assembly" ? item.pricingMode ?? "sumOfChildren" : undefined });
  };

  useEffect(() => {
    if (IMAGE_UPLOAD_ENABLED && isDriveConfigured && !isDriveUploadProxy) preloadDriveScript();
  }, []);

  const toUploadError = (e: unknown, fallback: string) =>
    e instanceof DriveError
      ? { message: e.message, hints: e.hints }
      : { message: e instanceof Error ? e.message : fallback, hints: [] };

  // Must stay synchronous up to connectDrive(): the popup needs the click's user activation.
  const handleDriveConnect = () => {
    setUploadError(null);
    connectDrive().then(
      () => setDriveConnected(true),
      (e) => setUploadError(toUploadError(e, "Google-kirjautuminen epäonnistui.")),
    );
  };

  const handleDriveUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadImageToDrive(file);
      onChange({ imageUrl: url });
    } catch (e) {
      setUploadError(toUploadError(e, "Kuvan lataus Google Driveen epäonnistui."));
      setDriveConnected(isDriveUploadProxy || hasDriveToken());
    } finally {
      setUploading(false);
    }
  };

  const handleFirebaseUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadItemImage(structureId, item.id, file);
      onChange({ imageUrl: url });
    } catch (e) {
      setUploadError(toUploadError(e, "Kuvan lataus epäonnistui."));
    } finally {
      setUploading(false);
    }
  };

  const isCategory = item.type === "category";
  const fieldClass =
    "w-full rounded-lg border border-[var(--line)] bg-[var(--panel-2)] px-2 py-1.5 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--accent)] focus:shadow-[0_0_0_3px_var(--accent-soft)]";
  const labelClass = "mb-0.5 block text-xs text-[var(--ink-2)]";

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-1">
          <input
            type="text"
            value={item.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="w-full rounded-lg border border-transparent bg-transparent px-1 py-0.5 text-[21px] font-semibold text-[var(--ink)] outline-none transition hover:border-[var(--line)] focus:border-[var(--accent)] focus:bg-[var(--panel-2)] focus:shadow-[0_0_0_3px_var(--accent-soft)]"
            placeholder="Nimikkeen nimi"
          />
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1 font-mono text-xs text-[var(--ink-3)]">
            <select
              value={item.type}
              onChange={(e) => handleTypeChange(e.target.value as ItemType)}
              className="rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-2 py-0.5 text-[var(--ink-2)] outline-none"
            >
              {(Object.keys(TYPE_LABELS) as ItemType[]).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            {item.type === "assembly" && (
              <>
                <span>·</span>
                <select
                  value={item.pricingMode ?? "sumOfChildren"}
                  onChange={(e) => onChange({ pricingMode: e.target.value as PricingMode })}
                  className="rounded-full border border-[var(--line)] bg-[var(--panel-2)] px-2 py-0.5 text-[var(--ink-2)] outline-none"
                >
                  {(Object.keys(PRICING_LABELS) as PricingMode[]).map((m) => (
                    <option key={m} value={m}>
                      {PRICING_LABELS[m]}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
          {typeChangeError && <p className="mt-1 px-1 text-xs text-[var(--warn)]">{typeChangeError}</p>}
        </div>

        {!isCategory && (
          <AnimatedImage
            imageUrl={item.imageUrl}
            expanded={imageExpanded}
            onToggle={() => setImageExpanded((v) => !v)}
            code={item.code}
          />
        )}
      </div>

      {isCategory && (
        <p className="rounded-lg border border-[var(--line)] bg-[var(--panel-2)] p-3 text-xs text-[var(--ink-2)]">
          Väliotsikolla ei ole hintaa, koodia, väriä tai kuvaa - se näkyy simuloinnissa aina, ilman omaa valintaa.
          Sen omat lapset (oikean paneelin Ryhmät) toimivat normaalisti. Väliotsikon alle voi lisätä myös
          alaotsikoita: lisää lapsinimike (+) ja valitse tyypiksi Väliotsikko.
        </p>
      )}

      {!isCategory && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Nimikekoodi</label>
            <input
              type="text"
              className={`${fieldClass} font-mono`}
              value={item.code ?? ""}
              onChange={(e) => onChange({ code: e.target.value || undefined })}
            />
          </div>
          <div>
            <label className={labelClass}>
              Hinta {item.type === "assembly" && item.pricingMode === "sumOfChildren" ? "(summautuu lapsista)" : ""}
            </label>
            <input
              type="number"
              className={`${fieldClass} font-mono disabled:opacity-50`}
              disabled={item.type === "assembly" && item.pricingMode === "sumOfChildren"}
              value={item.price ?? ""}
              onChange={(e) => onChange({ price: e.target.value === "" ? undefined : Number(e.target.value) })}
            />
          </div>
        </div>
      )}

      <div>
        <label className={labelClass}>Kuvaus</label>
        <textarea
          className={fieldClass}
          rows={2}
          value={item.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value || undefined })}
        />
      </div>

      {!isCategory && !isRoot && (
        <label className="flex items-start gap-2 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            className="mt-1"
            checked={item.defaultSelected ?? false}
            onChange={(e) => onDefaultChange(e.target.checked)}
          />
          <span>
            Oletuksena valittuna simuloinnissa
            <span className="block text-xs text-[var(--ink-3)]">
              Esivalinta alussa ja nollattaessa. Käyttäjä voi vaihtaa tai poistaa valinnan.
            </span>
          </span>
        </label>
      )}

      {!isCategory && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Väri</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  className={fieldClass}
                  placeholder="#dc2626 tai punainen"
                  value={item.color ?? ""}
                  onChange={(e) => onChange({ color: e.target.value || undefined })}
                />
                {item.color && (
                  <span
                    className="h-7 w-7 shrink-0 rounded-full border border-[var(--line)]"
                    style={{ backgroundColor: item.color }}
                  />
                )}
              </div>
            </div>
            <div>
              <label className={labelClass}>Kuvan URL</label>
              <input
                type="text"
                className={fieldClass}
                placeholder="https://..."
                value={item.imageUrl ?? ""}
                onChange={(e) => onChange({ imageUrl: e.target.value || undefined })}
              />
            </div>
          </div>
          <p className="-mt-2 px-1 text-xs text-[var(--ink-3)]">
            Käy myös suoraan liitettynä linkkinä, esim. Google Drivestä (muunna jaettu tiedosto muotoon
            drive.google.com/thumbnail?id=TIEDOSTON_ID&sz=w1000).
          </p>

          {IMAGE_UPLOAD_ENABLED && (
          <div className="rounded-[12px] bg-[var(--panel-2)] p-3">
            {isDriveConfigured ? (
              <>
                <label className={labelClass}>...tai lataa tiedosto Google Driveen</label>
                {driveConnected ? (
                  <input
                    type="file"
                    accept="image/*"
                    disabled={uploading}
                    className="w-full text-xs text-[var(--ink-2)]"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleDriveUpload(file);
                      e.target.value = "";
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={handleDriveConnect}
                    className="rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs text-[var(--ink)] transition hover:border-[var(--accent)]"
                  >
                    Kirjaudu Google Driveen
                  </button>
                )}
                <p className="mt-0.5 text-xs text-[var(--ink-3)]">
                  {isDriveUploadProxy
                    ? "Kuva tallennetaan projektin Drive-kansioon, kirjautumista ei tarvita."
                    : driveConnected
                    ? "Kirjautuminen voimassa (n. 1 h)."
                    : "Avautuu Google-kirjautumisikkuna - hyväksy pääsy omaan Drive-kansioosi. Salli ponnahdusikkunat, jos selain estää sen."}
                </p>
              </>
            ) : (
              <>
                <label className={labelClass}>...tai lataa tiedosto Firebase Storageen</label>
                <input
                  type="file"
                  accept="image/*"
                  disabled={!isFirebaseConfigured || uploading}
                  className="w-full text-xs text-[var(--ink-2)]"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFirebaseUpload(file);
                  }}
                />
                {!isFirebaseConfigured && (
                  <p className="text-xs text-[var(--warn)]">Firebase ei konfiguroitu, kuvan lataus ei käytössä.</p>
                )}
              </>
            )}
            {uploading && <p className="text-xs text-[var(--ink-3)]">Ladataan...</p>}
            {uploadError && (
              <div className="mt-1 text-xs text-[var(--warn)]">
                <p>{uploadError.message}</p>
                {uploadError.hints.length > 0 && (
                  <ul className="mt-0.5 list-disc pl-4">
                    {uploadError.hints.map((h) => (
                      <li key={h}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          )}

          <div>
            <h3 className="mb-1 text-sm font-semibold text-[var(--ink)]">Attribuutit</h3>
            <AttributesEditor
              attributes={item.attributes}
              overrides={item.overridesParentAttributes}
              defaults={attributeDefaults}
              keySuggestions={attributeKeys}
              onSetDefault={onSetAttributeDefault}
              onChange={(attributes, overridesParentAttributes) => onChange({ attributes, overridesParentAttributes })}
            />
          </div>
        </>
      )}
    </div>
  );
}

function AnimatedImage({
  imageUrl,
  expanded,
  onToggle,
  code,
}: {
  imageUrl?: string;
  expanded: boolean;
  onToggle: () => void;
  code?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      title={expanded ? "Pienennä kuva" : "Suurenna kuva"}
      className="image-placeholder shrink-0 overflow-hidden rounded-[14px] border border-[var(--line)] transition-[width,height] duration-[280ms] [transition-timing-function:cubic-bezier(.22,.8,.3,1)]"
      style={expanded ? { width: "min(340px,100%)", height: 240 } : { width: 96, height: 96 }}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-mono text-xs text-[var(--ink-3)]">
          {code || "EI KUVAA"}
        </span>
      )}
    </button>
  );
}
