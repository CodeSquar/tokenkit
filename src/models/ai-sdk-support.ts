  import type { Provider } from "../types/index.js";

  const supportedModelPrefixes: Record<Provider, string[]> = {
    openai: [
      "gpt-3.5-turbo",
      "gpt-4-turbo",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4.1-nano",
      "gpt-4o",
      "gpt-4o-mini",
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-5.1",
      "gpt-5.2",
      "gpt-5.4",
      "gpt-5.4-mini",
      "gpt-5.4-nano",
      "gpt-5.4-pro",
      "gpt-5.5",
      "gpt-5.5-pro",
      "o1",
      "o1-mini",
      "o1-preview",
      "o3-mini",
      "o4-mini",
    ],
    anthropic: [
      "claude-3-5-haiku-20241022",
      "claude-3-5-sonnet-20241022",
      "claude-haiku-3-5",
      "claude-haiku-4-5",
      "claude-opus-4-1",
      "claude-opus-4-5",
      "claude-opus-4-6",
      "claude-opus-4-7",
      "claude-sonnet-4-5",
      "claude-sonnet-4-6",
    ],
    google: [
      "gemini-2.0-flash",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-2.5-pro",
      "gemini-3-flash-preview",
      "gemini-3-pro-preview",
      "gemini-3.1-flash-lite",
      "gemini-3.1-pro-preview",
      "gemini-3.5-flash",
    ],
  };

export function isAISdkModelSupported(
  provider: Provider,
  model: string,
): boolean {
  const supported = supportedModelPrefixes[provider];
  return supported.some((prefix) => model === prefix || model.startsWith(`${prefix}-`));
}

