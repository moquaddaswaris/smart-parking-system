export interface SlotTopology {
  id: number;
  code: string;
  zone: "zone1" | "zone2";
  zoneLabel: string;
  leftNeighbor: string;
  rightNeighbor: string;
  pairedWith: string | null;
  styleIdx: number;
}

export interface VehicleStyle {
  label: string;
  body: string;
  roof: string;
  stroke: string;
}

export const VEHICLE_STYLES: VehicleStyle[] = [
  { label: "Dark SUV (Compact)", body: "#1e293b", roof: "#0f172a", stroke: "#020617" },
  { label: "Dark Obsidian SUV", body: "#111827", roof: "#030717", stroke: "#000000" },
  { label: "White SUV", body: "#f8fafc", roof: "#e2e8f0", stroke: "#64748b" },
  { label: "Dark Blue SUV", body: "#1d4ed8", roof: "#1e3a8a", stroke: "#172554" },
  { label: "White Hatchback", body: "#ffffff", roof: "#e2e8f0", stroke: "#94a3b8" },
  { label: "White Compact SUV", body: "#f1f5f9", roof: "#cbd5e1", stroke: "#64748b" },
  { label: "Silver / Slate SUV", body: "#cbd5e1", roof: "#94a3b8", stroke: "#475569" },
];

export const COURTYARD_TOPOLOGY: Record<number, SlotTopology> = {
  // Zone 1 — 7 Linear Slots Horizontally (Left to Right: P01 -> P07)
  1: { id: 1, code: "P01", zone: "zone1", zoneLabel: "Zone 1 · Linear Row", leftNeighbor: "Courtyard Edge", rightNeighbor: "P02", pairedWith: null, styleIdx: 0 },
  2: { id: 2, code: "P02", zone: "zone1", zoneLabel: "Zone 1 · Linear Row", leftNeighbor: "P01", rightNeighbor: "P03", pairedWith: null, styleIdx: 1 },
  3: { id: 3, code: "P03", zone: "zone1", zoneLabel: "Zone 1 · Linear Row", leftNeighbor: "P02", rightNeighbor: "P04", pairedWith: null, styleIdx: 2 },
  4: { id: 4, code: "P04", zone: "zone1", zoneLabel: "Zone 1 · Linear Row", leftNeighbor: "P03", rightNeighbor: "P05", pairedWith: null, styleIdx: 4 },
  5: { id: 5, code: "P05", zone: "zone1", zoneLabel: "Zone 1 · Linear Row", leftNeighbor: "P04", rightNeighbor: "P06", pairedWith: null, styleIdx: 2 },
  6: { id: 6, code: "P06", zone: "zone1", zoneLabel: "Zone 1 · Linear Row", leftNeighbor: "P05", rightNeighbor: "P07", pairedWith: null, styleIdx: 3 },
  7: { id: 7, code: "P07", zone: "zone1", zoneLabel: "Zone 1 · Linear Row", leftNeighbor: "P06", rightNeighbor: "1-Car Gap", pairedWith: null, styleIdx: 5 },

  // Zone 2 Bottom/Front Row (Left to Right: P08 -> P13)
  8: { id: 8, code: "P08", zone: "zone2", zoneLabel: "Zone 2 · Parallel Grid (Front)", leftNeighbor: "1-Car Gap", rightNeighbor: "P09", pairedWith: "P19", styleIdx: 4 },
  9: { id: 9, code: "P09", zone: "zone2", zoneLabel: "Zone 2 · Parallel Grid (Front)", leftNeighbor: "P08", rightNeighbor: "P10", pairedWith: "P18", styleIdx: 5 },
  10: { id: 10, code: "P10", zone: "zone2", zoneLabel: "Zone 2 · Parallel Grid (Front)", leftNeighbor: "P09", rightNeighbor: "P11", pairedWith: "P17", styleIdx: 4 },
  11: { id: 11, code: "P11", zone: "zone2", zoneLabel: "Zone 2 · Parallel Grid (Front)", leftNeighbor: "P10", rightNeighbor: "P12", pairedWith: "P16", styleIdx: 5 },
  12: { id: 12, code: "P12", zone: "zone2", zoneLabel: "Zone 2 · Parallel Grid (Front)", leftNeighbor: "P11", rightNeighbor: "P13", pairedWith: "P15", styleIdx: 6 },
  13: { id: 13, code: "P13", zone: "zone2", zoneLabel: "Zone 2 · Parallel Grid (Front)", leftNeighbor: "P12", rightNeighbor: "Courtyard Edge", pairedWith: "P14", styleIdx: 4 },

  // Zone 2 Top/Back Row (Left to Right: P19 -> P14)
  14: { id: 14, code: "P14", zone: "zone2", zoneLabel: "Zone 2 · Parallel Grid (Back)", leftNeighbor: "P15", rightNeighbor: "Courtyard Edge", pairedWith: "P13", styleIdx: 6 },
  15: { id: 15, code: "P15", zone: "zone2", zoneLabel: "Zone 2 · Parallel Grid (Back)", leftNeighbor: "P16", rightNeighbor: "P14", pairedWith: "P12", styleIdx: 5 },
  16: { id: 16, code: "P16", zone: "zone2", zoneLabel: "Zone 2 · Parallel Grid (Back)", leftNeighbor: "P17", rightNeighbor: "P15", pairedWith: "P11", styleIdx: 4 },
  17: { id: 17, code: "P17", zone: "zone2", zoneLabel: "Zone 2 · Parallel Grid (Back)", leftNeighbor: "P18", rightNeighbor: "P16", pairedWith: "P10", styleIdx: 4 },
  18: { id: 18, code: "P18", zone: "zone2", zoneLabel: "Zone 2 · Parallel Grid (Back)", leftNeighbor: "P19", rightNeighbor: "P17", pairedWith: "P09", styleIdx: 5 },
  19: { id: 19, code: "P19", zone: "zone2", zoneLabel: "Zone 2 · Parallel Grid (Back)", leftNeighbor: "1-Car Gap", rightNeighbor: "P18", pairedWith: "P08", styleIdx: 6 },
};

export function getSlotCode(id: number): string {
  return COURTYARD_TOPOLOGY[id]?.code || `P${String(id).padStart(2, "0")}`;
}

