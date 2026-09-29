/**
 * The "Typical Trade Process". Presented as a typical flow, not as a guarantee that every step is
 * operational for every order. Localised titles/descriptions live in `globalTrade.process.<id>`.
 */
export const TRADE_PROCESS_STEPS = [
  "inquiry",
  "requirement-analysis",
  "sourcing",
  "quotation",
  "order-confirmation",
  "documentation",
  "shipping",
  "delivery",
] as const;

export type TradeProcessStep = (typeof TRADE_PROCESS_STEPS)[number];
