// Fictional sample product structure used as a starting point / demo.
// Purely illustrative - not real vehicle or customer data.

import { v4 as uuid } from "uuid";
import type { ConditionalRule, Item, ProductStructure, SelectionGroup } from "../types";

export function buildSampleStructure(name = "Esimerkki: Kuvitteellinen kuorma-auto"): ProductStructure {
  const rootId = uuid();
  const frameSteel = uuid();
  const frameAluminium = uuid();
  const engineDiesel300 = uuid();
  const engineDiesel400 = uuid();
  const engineElectric = uuid();
  const colorRed = uuid();
  const colorBlue = uuid();
  const colorWhite = uuid();
  const optCamera = uuid();
  const optAircon = uuid();
  const optCharger = uuid();
  const basePackage = uuid();

  const frameGroupId = uuid();
  const engineGroupId = uuid();
  const colorGroupId = uuid();
  const optionsGroupId = uuid();

  const items: Record<string, Item> = {
    [rootId]: {
      id: rootId,
      name,
      code: "TRUCK-X",
      description: "Kuvitteellinen raskaan kaluston perusmalli, esimerkkidataa.",
      type: "assembly",
      pricingMode: "sumOfChildren",
      color: "#94a3b8",
      attributes: [{ key: "paino_kg", value: "8000" }],
      overridesParentAttributes: [],
      children: [basePackage, frameSteel, frameAluminium, engineDiesel300, engineDiesel400, engineElectric, colorRed, colorBlue, colorWhite, optCamera, optAircon, optCharger],
      required: true,
    },
    [basePackage]: {
      id: basePackage,
      name: "Peruspaketti",
      code: "BASE-001",
      description: "Sisältää ohjaamon ja perusvarustelun.",
      type: "single",
      price: 45000,
      attributes: [],
      overridesParentAttributes: [],
      children: [],
      required: true,
    },
    [frameSteel]: {
      id: frameSteel,
      name: "Teräsrunko",
      code: "FRAME-STEEL",
      type: "single",
      price: 3200,
      attributes: [{ key: "materiaali", value: "Teräs" }, { key: "paino_kg", value: "1200" }],
      overridesParentAttributes: ["materiaali", "paino_kg"],
      children: [],
    },
    [frameAluminium]: {
      id: frameAluminium,
      name: "Alumiinirunko",
      code: "FRAME-ALU",
      type: "single",
      price: 5400,
      attributes: [{ key: "materiaali", value: "Alumiini" }, { key: "paino_kg", value: "850" }],
      overridesParentAttributes: ["materiaali", "paino_kg"],
      children: [],
    },
    [engineDiesel300]: {
      id: engineDiesel300,
      name: "Diesel 300hv",
      code: "ENG-D300",
      type: "single",
      price: 8000,
      attributes: [{ key: "teho_hv", value: "300" }, { key: "polttoaine", value: "Diesel" }],
      overridesParentAttributes: ["teho_hv", "polttoaine"],
      children: [],
    },
    [engineDiesel400]: {
      id: engineDiesel400,
      name: "Diesel 400hv",
      code: "ENG-D400",
      type: "single",
      price: 11500,
      attributes: [{ key: "teho_hv", value: "400" }, { key: "polttoaine", value: "Diesel" }],
      overridesParentAttributes: ["teho_hv", "polttoaine"],
      children: [],
    },
    [engineElectric]: {
      id: engineElectric,
      name: "Sähkömoottori 350hv",
      code: "ENG-E350",
      type: "single",
      price: 21000,
      attributes: [{ key: "teho_hv", value: "350" }, { key: "polttoaine", value: "Sähkö" }],
      overridesParentAttributes: ["teho_hv", "polttoaine"],
      children: [],
    },
    [colorRed]: {
      id: colorRed,
      name: "Punainen",
      type: "single",
      price: 0,
      color: "#dc2626",
      attributes: [{ key: "vari", value: "Punainen" }],
      overridesParentAttributes: ["vari"],
      children: [],
    },
    [colorBlue]: {
      id: colorBlue,
      name: "Sininen",
      type: "single",
      price: 0,
      color: "#2563eb",
      attributes: [{ key: "vari", value: "Sininen" }],
      overridesParentAttributes: ["vari"],
      children: [],
    },
    [colorWhite]: {
      id: colorWhite,
      name: "Valkoinen",
      type: "single",
      price: 300,
      color: "#f8fafc",
      attributes: [{ key: "vari", value: "Valkoinen" }],
      overridesParentAttributes: ["vari"],
      children: [],
    },
    [optCamera]: {
      id: optCamera,
      name: "Peruutuskamera",
      code: "OPT-CAM",
      type: "single",
      price: 650,
      attributes: [],
      overridesParentAttributes: [],
      children: [],
    },
    [optAircon]: {
      id: optAircon,
      name: "Ilmastointi",
      code: "OPT-AC",
      type: "single",
      price: 1200,
      attributes: [],
      overridesParentAttributes: [],
      children: [],
    },
    [optCharger]: {
      id: optCharger,
      name: "Latauslaite (sähköversiolle)",
      code: "OPT-CHARGER",
      type: "single",
      price: 2500,
      attributes: [],
      overridesParentAttributes: [],
      children: [],
    },
  };

  const groups: Record<string, SelectionGroup> = {
    [frameGroupId]: {
      id: frameGroupId,
      name: "Runko",
      parentItemId: rootId,
      memberItemIds: [frameSteel, frameAluminium],
      min: 1,
      max: 1,
    },
    [engineGroupId]: {
      id: engineGroupId,
      name: "Moottorivaihtoehto",
      parentItemId: rootId,
      memberItemIds: [engineDiesel300, engineDiesel400, engineElectric],
      min: 1,
      max: 1,
    },
    [colorGroupId]: {
      id: colorGroupId,
      name: "Väri",
      parentItemId: rootId,
      memberItemIds: [colorRed, colorBlue, colorWhite],
      min: 1,
      max: 1,
    },
    [optionsGroupId]: {
      id: optionsGroupId,
      name: "Lisävarusteet",
      parentItemId: rootId,
      memberItemIds: [optCamera, optAircon, optCharger],
      min: 0,
      max: null,
    },
  };

  const rulesList: ConditionalRule[] = [
    {
      id: uuid(),
      type: "excludes",
      sourceItemId: engineElectric,
      targetItemId: frameSteel,
      note: "Sähkömoottori vaatii kevyemmän alumiinirungon (esimerkkisääntö).",
    },
    {
      id: uuid(),
      type: "requires",
      sourceItemId: engineElectric,
      targetItemId: optCharger,
      note: "Sähköversio tarvitsee aina latauslaitteen.",
    },
  ];
  const rulesById: Record<string, ConditionalRule> = {};
  rulesList.forEach((r) => {
    rulesById[r.id] = r;
  });

  return {
    id: uuid(),
    name,
    rootItemId: rootId,
    items,
    groups,
    rules: rulesById,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}
