export type PriceTier = { minQty: number; price: number };

export function unitPriceForQty(
  tiers: PriceTier[],
  basePrice: number | null | undefined,
  qty: number
) {
  const q = Math.max(1, qty);

  // tiers ordenados asc por minQty
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);

  // elegimos el último tier que cumpla minQty <= qty
  let chosen: PriceTier | null = null;
  for (const t of sorted) {
    if (t.minQty <= q) chosen = t;
    else break;
  }

  return chosen?.price ?? basePrice ?? 0;
}
