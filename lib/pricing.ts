/**
 * Pricing rules for converting CJ Dropshipping cost prices into our
 * storefront sale prices.
 */

export type PricingStrategy = "default" | "premium" | "clearance";

/** Absolute floor: sale price is never less than cost * MIN_MULTIPLIER. */
export const MIN_MULTIPLIER = 2.4;

interface PricingTier {
  /** Upper bound (inclusive) of cost this tier applies to. */
  maxCost: number;
  multiplier: number;
}

// Cheaper items get a higher multiplier since fixed costs (payment fees,
// ads, packaging) eat a much larger share of a low-cost order.
const STRATEGY_TIERS: Record<PricingStrategy, PricingTier[]> = {
  default: [
    { maxCost: 3, multiplier: 4.0 },
    { maxCost: 10, multiplier: 3.2 },
    { maxCost: 25, multiplier: 2.8 },
    { maxCost: 50, multiplier: 2.5 },
    { maxCost: Infinity, multiplier: MIN_MULTIPLIER },
  ],
  premium: [
    { maxCost: 3, multiplier: 5.0 },
    { maxCost: 10, multiplier: 4.0 },
    { maxCost: 25, multiplier: 3.4 },
    { maxCost: 50, multiplier: 3.0 },
    { maxCost: Infinity, multiplier: 2.6 },
  ],
  clearance: [
    { maxCost: Infinity, multiplier: MIN_MULTIPLIER },
  ],
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Rounds up to the nearest X.99 without ever going below `value`. */
function roundToPsychological(value: number): number {
  if (value <= 0) return 0;
  const candidate = Math.floor(value) + 0.99;
  return round2(candidate >= value ? candidate : candidate + 1);
}

/**
 * Converts a CJ cost price into our sale price using the given strategy.
 * The result is always >= cost * MIN_MULTIPLIER and ends in .99.
 */
export function calculateSalePrice(cost: number, strategy: PricingStrategy = "default"): number {
  if (!Number.isFinite(cost) || cost <= 0) return 0;

  const tiers = STRATEGY_TIERS[strategy] ?? STRATEGY_TIERS.default;
  const tier = tiers.find((t) => cost <= t.maxCost) ?? tiers[tiers.length - 1];
  const multiplier = Math.max(tier.multiplier, MIN_MULTIPLIER);

  return roundToPsychological(cost * multiplier);
}

/** Clamps a manually-entered price to the minimum allowed margin. */
export function applyMinimumMargin(cost: number, proposedPrice: number): number {
  const minimum = round2(cost * MIN_MULTIPLIER);
  return Math.max(proposedPrice, minimum);
}

export interface MarginInfo {
  profit: number;
  marginPercent: number;
  multiplier: number;
}

/** Profit, margin % and multiplier for a given cost/sale price pair. */
export function getMarginInfo(cost: number, salePrice: number): MarginInfo {
  if (cost <= 0 || salePrice <= 0) {
    return { profit: round2(salePrice - cost), marginPercent: 0, multiplier: 0 };
  }

  return {
    profit: round2(salePrice - cost),
    marginPercent: round2(((salePrice - cost) / salePrice) * 100),
    multiplier: round2(salePrice / cost),
  };
}
