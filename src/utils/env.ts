import type { Provider } from "../types/index.js";

const ENV_KEYS: Record<Provider, string[]> = {
  openai: ["OPENAI_API_KEY"],
  anthropic: ["ANTHROPIC_API_KEY"],
  google: ["GEMINI_API_KEY", "GOOGLE_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY"],
};

export function resolveApiKey(
  provider: Provider,
  explicit?: string,
): string | undefined {
  if (explicit) {
    return explicit;
  }
  for (const key of ENV_KEYS[provider]) {
    const value = process.env[key];
    if (value) {
      return value;
    }
  }
  return undefined;
}
