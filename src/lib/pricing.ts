export type PriceTier = {
  minQty: number;
  price: number;
};

export type PricingRule = {
  minUsd: number;
  maxUsd: number;
  multiplier: number;
};

export function calculatePrice(
  usdCost: number,
  exchangeRate: number,
  multiplier: number
): number {
  if (!Number.isFinite(usdCost) || usdCost < 0) {
    throw new Error("Costo USD inválido");
  }

  if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
    throw new Error("Cotización inválida");
  }

  if (!Number.isFinite(multiplier) || multiplier <= 0) {
    throw new Error("Multiplicador inválido");
  }

  return Math.round(usdCost * exchangeRate * multiplier);
}

export function findPriceRule(
  usdCost: number,
  rules: PricingRule[]
): PricingRule | null {
  if (!Number.isFinite(usdCost) || usdCost < 0) {
    return null;
  }

  const sortedRules = [...rules].sort(
    (a, b) => a.minUsd - b.minUsd
  );

  for (let index = 0; index < sortedRules.length; index++) {
    const rule = sortedRules[index];
    const isLast = index === sortedRules.length - 1;

    const matches =
      usdCost >= rule.minUsd &&
      (isLast
        ? usdCost <= rule.maxUsd
        : usdCost < rule.maxUsd);

    if (matches) {
      return rule;
    }
  }

  return null;
}

export function unitPriceForQty(
  tiers: PriceTier[],
  basePrice: number | null | undefined,
  qty: number
): number {
  const q = Math.max(1, qty);

  const sorted = [...tiers].sort(
    (a, b) => a.minQty - b.minQty
  );

  let chosen: PriceTier | null = null;

  for (const tier of sorted) {
    if (tier.minQty <= q) {
      chosen = tier;
    } else {
      break;
    }
  }

  return chosen?.price ?? basePrice ?? 0;
}