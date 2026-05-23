import { calculatePrice } from "./calculate-price.js";
import { ValidationError } from "./errors/index.js";
import { getAdapter } from "./providers/registry.js";
import { executeCount } from "./providers/mode-resolver.js";
import type {
  AnyNormalizedInput,
  CountTokensOptions,
  CountTokensResult,
} from "./types/index.js";
import { resolveApiKey } from "./utils/env.js";

function invalid(path: string, reason: string): never {
  throw new ValidationError(`${path}: ${reason}`);
}

function ensureNonEmptyString(value: unknown, path: string): string {
  if (typeof value !== "string") {
    invalid(path, "must be a string");
  }
  if (value.trim() === "") {
    invalid(path, "must be a non-empty string");
  }
  return value;
}

function ensureArray(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value)) {
    invalid(path, "must be an array");
  }
  return value;
}

function normalizeInput(options: CountTokensOptions): AnyNormalizedInput {
  const model = ensureNonEmptyString(options.model, "model");
  const countAssistantTools = options.countAssistantTools ?? true;
  const apiKey = resolveApiKey(options.provider, options.apiKey);

  if (options.provider === "openai") {
    if (options.input === undefined || options.input === null) {
      invalid("input", "is required");
    }
    if (typeof options.input !== "string" && !Array.isArray(options.input)) {
      invalid("input", "must be a string or ResponseInput");
    }
    if (typeof options.input === "string" && options.input.trim() === "") {
      invalid("input", "must be a non-empty string when it is a string");
    }
    return {
      provider: "openai",
      model,
      payload: options.input,
      apiKey,
      countAssistantTools,
    };
  }

  if (options.provider === "anthropic") {
    const messages = ensureArray(options.messages, "messages");
    if (messages.length === 0) {
      invalid("messages", "must include at least one message");
    }
    if (options.system !== undefined && typeof options.system !== "string") {
      invalid("system", "must be a string");
    }
    return {
      provider: "anthropic",
      model,
      payload: options.messages,
      system: options.system,
      apiKey,
      countAssistantTools,
    };
  }

  const contents = ensureArray(options.contents, "contents");
  if (contents.length === 0) {
    invalid("contents", "must include at least one content item");
  }

  return {
    provider: "google",
    model,
    payload: options.contents,
    system: options.systemInstruction,
    apiKey,
    countAssistantTools,
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
