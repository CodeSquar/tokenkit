import type { Provider } from "../types/index.js";
import { resolveModelCatalog } from "../models/resolve-model.js";

type PricingEntry = { inputPer1M: number };

export function pricingKey(provider: Provider, model: string): string {
  return `${provider}:${model}`;
}

export function resolveModelPricing(
  provider: Provider,
  model: string,
): PricingEntry | null {
  const entry = resolveModelCatalog(provider, model);
  if (!entry || typeof entry.inputPer1M !== "number") {
    return null;
  }
  return { inputPer1M: entry.inputPer1M };
}
