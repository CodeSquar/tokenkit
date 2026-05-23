import type { Provider } from "../types/index.js";
import catalog from "./catalog.json";

export interface ModelCatalogEntry {
  inputPer1M?: number;
  tiktokenEncoding?: string;
  isChatModel?: boolean;
}

const modelCatalog = catalog as Record<string, ModelCatalogEntry>;

export function catalogKey(provider: Provider, model: string): string {
  return `${provider}:${model}`;
}

export function resolveModelCatalog(
  provider: Provider,
  model: string,
): ModelCatalogEntry | null {
  const exact = modelCatalog[catalogKey(provider, model)];
  if (exact) {
    return exact;
  }

  const prefix = `${provider}:`;
  const matches = Object.keys(modelCatalog)
    .filter((key) => key.startsWith(prefix) && model.startsWith(key.slice(prefix.length)))
    .sort((a, b) => b.length - a.length);

  if (matches.length > 0) {
    return modelCatalog[matches[0]!] ?? null;
  }

  return null;
}
