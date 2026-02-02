import motoLocalities from "@/data/motoLocalities.json";

export type MotoZone = "CABA" | "GBA1" | "GBA2";

export const MOTO_PRICES: Record<MotoZone, number> = {
  CABA: 4500,
  GBA1: 6500,
  GBA2: 8500,
};

// Normaliza para comparar (acentos, mayúsculas, etc.)
function norm(s: string) {
  return (s ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function getMotoLocalitiesByZone(): Record<MotoZone, string[]> {
  return motoLocalities as Record<MotoZone, string[]>;
}

export function isMotoLocality(zone: MotoZone, locality: string) {
  const list = (motoLocalities as Record<MotoZone, string[]>)[zone] ?? [];
  const target = norm(locality);
  return list.some((x) => norm(x) === target);
}

export function getMotoFromLocality(zone: MotoZone, locality: string) {
  if (!isMotoLocality(zone, locality)) return null;

  // devolvemos la localidad "canon" como está en el JSON
  const list = (motoLocalities as Record<MotoZone, string[]>)[zone] ?? [];
  const canon = list.find((x) => norm(x) === norm(locality)) ?? locality;

  return {
    zone,
    locality: canon,
    price: MOTO_PRICES[zone],
  };
}
