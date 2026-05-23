import { calculatePrice } from "./calculate-price.js";
import { getAdapter } from "./providers/registry.js";
import { executeCount } from "./providers/mode-resolver.js";
import type {
  CountTokensOptions,
  CountTokensResult,
  NormalizedInput,
} from "./types/index.js";
import { resolveApiKey } from "./utils/env.js";
import {
  partitionSystemMessages,
  resolveMessages,
} from "./utils/messages.js";

function normalizeInput(options: CountTokensOptions): NormalizedInput {
  const { system, messages } = partitionSystemMessages(
    resolveMessages(options.messages, options.text),
    options.system,
  );

  return {
    provider: options.provider,
    model: options.model,
    messages,
    system,
    apiKey: resolveApiKey(options.provider, options.apiKey),
    countAssistantTools: options.countAssistantTools ?? true,
  };
}

export async function countTokens(
  options: CountTokensOptions,
): Promise<CountTokensResult> {
  const input = normalizeInput(options);
  const mode = options.mode ?? "auto";
  const adapter = getAdapter(options.provider);
  const execution = await executeCount(adapter, input, mode);

  return {
    provider: options.provider,
    model: options.model,
    tokens: execution.tokens,
    estimated: execution.estimated,
    method: execution.method,
    price: calculatePrice({
      provider: options.provider,
      model: options.model,
      tokens: execution.tokens,
    }),
  };
}
