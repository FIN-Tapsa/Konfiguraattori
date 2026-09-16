// Edit panel for a single selected item: basic fields, pricing, image, and
// generic attributes.

import { useState } from "react";
import type { Item, ItemType, PricingMode } from "../../types";
import { AttributesEditor } from "./AttributesEditor";
import { uploadItemImage } from "../../firebase/storage";
import { isFirebaseConfigured } from "../../firebase/config";

interface ItemPanelProps {
  item: Item;
  structureId: string;
  onChange: (changes: Partial<Item>) => void;
}

export function ItemPanel({ item, structureId, onChange }: ItemPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleTypeChange = (type: ItemType) => {
    if (type === "single" && item.children.length > 0) {
      window.alert("Kokoonpanoa, jolla on lapsinimikkeitä, ei voi muuttaa yksittäiseksi nimikkeeksi.");
      return;
    }
    onChange({ type, pricingMode: type === "assembly" ? item.pricingMode ?? "sumOfChildren" : undefined });
  };

  const handleImageUpload = async (file: File) => {
    setUploading(true);
    setUploadError(null);
    try {
      const url = await uploadItemImage(structureId, item.id, file);
      onChange({ imageUrl: url });
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Kuvan lataus epäonnistui.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="mb-0.5 block text-xs text-slate-500">Nimi</label>
        <input
          type="text"
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          value={item.name}
          onChange={(e) => onChange({ name: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-0.5 block text-xs text-slate-500">Nimikekoodi</label>
          <input
            type="text"
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            value={item.code ?? ""}
            onChange={(e) => onChange({ code: e.target.value || undefined })}
          />
        </div>
        <div>
          <label className="mb-0.5 block text-xs text-slate-500">Tyyppi</label>
          <select
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            value={item.type}
            onChange={(e) => handleTypeChange(e.target.value as ItemType)}
          >
            <option value="single">Yksittäinen nimike</option>
            <option value="assembly">Kokoonpano</option>
          </select>
        </div>
      </div>

      <div>
        <label className="mb-0.5 block text-xs text-slate-500">Kuvaus</label>
        <textarea
          className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
          rows={2}
          value={item.description ?? ""}
          onChange={(e) => onChange({ description: e.target.value || undefined })}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-0.5 block text-xs text-slate-500">
            Hinta {item.type === "assembly" && item.pricingMode === "sumOfChildren" ? "(ei käytössä, summautuu lapsista)" : ""}
          </label>
          <input
            type="number"
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100"
            disabled={item.type === "assembly" && item.pricingMode === "sumOfChildren"}
            value={item.price ?? ""}
            onChange={(e) => onChange({ price: e.target.value === "" ? undefined : Number(e.target.value) })}
          />
        </div>
        {item.type === "assembly" && (
          <div>
            <label className="mb-0.5 block text-xs text-slate-500">Hinnoittelutapa</label>
            <select
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
              value={item.pricingMode ?? "sumOfChildren"}
              onChange={(e) => onChange({ pricingMode: e.target.value as PricingMode })}
            >
              <option value="sumOfChildren">Lasten hintojen summa</option>
              <option value="fixed">Kiinteä hinta</option>
            </select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-0.5 block text-xs text-slate-500">Väri</label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
              placeholder="#dc2626 tai punainen"
              value={item.color ?? ""}
              onChange={(e) => onChange({ color: e.target.value || undefined })}
            />
            {item.color && <span className="h-6 w-6 shrink-0 rounded border border-slate-300" style={{ backgroundColor: item.color }} />}
          </div>
        </div>
        <div>
          <label className="mb-0.5 block text-xs text-slate-500">Kuvan URL</label>
          <input
            type="text"
            className="w-full rounded border border-slate-300 px-2 py-1 text-sm"
            placeholder="https://..."
            value={item.imageUrl ?? ""}
            onChange={(e) => onChange({ imageUrl: e.target.value || undefined })}
          />
          <p className="mt-0.5 text-xs text-slate-400">
            Käy myös suoraan liitettynä linkkinä, esim. Google Drivestä (muunna jaettu tiedosto muotoon
            drive.google.com/thumbnail?id=TIEDOSTON_ID&sz=w1000).
          </p>
        </div>
      </div>

      <div>
        <label className="mb-0.5 block text-xs text-slate-500">...tai lataa tiedosto Firebase Storageen</label>
        <input
          type="file"
          accept="image/*"
          disabled={!isFirebaseConfigured || uploading}
          className="w-full text-xs"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(file);
          }}
        />
        {uploading && <p className="text-xs text-slate-400">Ladataan...</p>}
        {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
        {!isFirebaseConfigured && <p className="text-xs text-amber-600">Firebase ei konfiguroitu, kuvan lataus ei käytössä.</p>}
      </div>

      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="h-24 w-24 rounded border border-slate-300 object-cover"
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />
      )}

      <div>
        <h3 className="mb-1 text-sm font-semibold text-slate-700">Attribuutit</h3>
        <AttributesEditor
          attributes={item.attributes}
          overrides={item.overridesParentAttributes}
          onChange={(attributes, overridesParentAttributes) => onChange({ attributes, overridesParentAttributes })}
        />
      </div>
    </div>
  );
}
