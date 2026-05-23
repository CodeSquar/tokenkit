import { calculatePrice } from "./calculate-price.js";
import { ValidationError } from "./errors/index.js";
import { getAdapter } from "./providers/registry.js";
import { executeCount } from "./providers/mode-resolver.js";
import type {
  AnyNormalizedInput,
  CountTokensOptions,
  CountTokensResult,
} from "./types/index.js";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";
import type { Content } from "@google/genai";
import { resolveApiKey } from "./utils/env.js";
import type { ModelMessage, UIMessage } from "ai";
import { convertToModelMessages } from "ai";
import { resolveModelCatalog } from "./models/resolve-model.js";
import { isAISdkModelSupported } from "./models/ai-sdk-support.js";
import { normalizeAISDKMessages } from "./providers/ai-sdk-normalize.js";

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

function ensureOnlyPaths(
  options: object,
  paths: string[],
): void {
  const allowed = new Set(paths);
  const raw = options as Record<string, unknown>;
  for (const path of Object.keys(raw)) {
    if (raw[path] === undefined) continue;
    if (!allowed.has(path)) {
      invalid(path, "is not allowed for the selected inputMode");
    }
  }
}

function normalizeTextMode(options: CountTokensOptions): AnyNormalizedInput {
  const model = ensureNonEmptyString(options.model, "model");
  const input = ensureNonEmptyString((options as { input?: unknown }).input, "input");
  const countAssistantTools = options.countAssistantTools ?? true;
  const apiKey = resolveApiKey(options.provider, options.apiKey);

  if (options.provider === "openai") {
    ensureOnlyPaths(options, [
      "provider",
      "model",
      "mode",
      "inputMode",
      "input",
      "apiKey",
      "countAssistantTools",
    ]);
    return {
      provider: "openai",
      model,
      payload: input,
      apiKey,
      countAssistantTools,
    };
  }

  if (options.provider === "anthropic") {
    ensureOnlyPaths(options, [
      "provider",
      "model",
      "mode",
      "inputMode",
      "input",
      "apiKey",
      "countAssistantTools",
      "system",
    ]);
    return {
      provider: "anthropic",
      model,
      payload: [{ role: "user", content: [{ type: "text", text: input }] }],
      system: options.system,
      apiKey,
      countAssistantTools,
    };
  }

  ensureOnlyPaths(options, [
    "provider",
    "model",
    "mode",
    "inputMode",
    "input",
    "apiKey",
    "countAssistantTools",
    "systemInstruction",
  ]);
  return {
    provider: "google",
    model,
    payload: [{ role: "user", parts: [{ text: input }] }],
    system: options.systemInstruction,
    apiKey,
    countAssistantTools,
  };
}

async function normalizeInput(options: CountTokensOptions): Promise<AnyNormalizedInput> {
  const inputMode = options.inputMode ?? "provider";
  if (inputMode !== "provider" && inputMode !== "text" && inputMode !== "ai_sdk") {
    invalid("inputMode", "must be \"provider\", \"text\" or \"ai_sdk\"");
  }
  if (inputMode === "text") {
    return normalizeTextMode(options);
  }
  if (inputMode === "ai_sdk") {
    return normalizeAISdkMode(options);
  }

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
    if ((options as { input?: unknown }).input !== undefined) {
      invalid("input", "is not allowed when inputMode is \"provider\"");
    }
    const messages = ensureArray(options.messages, "messages") as MessageParam[];
    if (messages.length === 0) {
      invalid("messages", "must include at least one message");
    }
    if (options.system !== undefined && typeof options.system !== "string") {
      invalid("system", "must be a string");
    }
    return {
      provider: "anthropic",
      model,
      payload: messages,
      system: options.system,
      apiKey,
      countAssistantTools,
    };
  }

  if ((options as { input?: unknown }).input !== undefined) {
    invalid("input", "is not allowed when inputMode is \"provider\"");
  }
  const contents = ensureArray(options.contents, "contents") as Content[];
  if (contents.length === 0) {
    invalid("contents", "must include at least one content item");
  }

  return {
    provider: "google",
    model,
    payload: contents,
    system: options.systemInstruction,
    apiKey,
    countAssistantTools,
  };
}

function ensureAiSdkModelAllowed(provider: CountTokensOptions["provider"], model: string): void {
  if (!resolveModelCatalog(provider, model)) {
    invalid("model", `is not present in TokenKit catalog for provider "${provider}"`);
  }
  if (!isAISdkModelSupported(provider, model)) {
    invalid("model", `is not supported by AI SDK for provider "${provider}"`);
  }
}

function readAiSdkMessages(options: CountTokensOptions): {
  messages?: ModelMessage[];
  uiMessages?: UIMessage[];
} {
  const withAi = options as CountTokensOptions & {
    aiSdkMessages?: ModelMessage[];
    uiMessages?: UIMessage[];
  };
  return { messages: withAi.aiSdkMessages, uiMessages: withAi.uiMessages };
}

async function normalizeAISdkMode(options: CountTokensOptions): Promise<AnyNormalizedInput> {
  const model = ensureNonEmptyString(options.model, "model");
  const countAssistantTools = options.countAssistantTools ?? true;
  const apiKey = resolveApiKey(options.provider, options.apiKey);
  const { messages, uiMessages } = readAiSdkMessages(options);

  ensureAiSdkModelAllowed(options.provider, model);

  if (messages !== undefined && uiMessages !== undefined) {
    invalid("aiSdkMessages", "cannot be used together with uiMessages");
  }

  let aiSdkMessages: ModelMessage[];
  if (Array.isArray(messages)) {
    if (messages.length === 0) {
      invalid("aiSdkMessages", "must include at least one message");
    }
    aiSdkMessages = messages;
  } else if (Array.isArray(uiMessages)) {
    if (uiMessages.length === 0) {
      invalid("uiMessages", "must include at least one message");
    }
    aiSdkMessages = await convertToModelMessages(uiMessages);
  } else {
    invalid("aiSdkMessages", "is required when inputMode is \"ai_sdk\" (or pass uiMessages)");
  }

  const normalized = normalizeAISDKMessages(aiSdkMessages);

  if (options.provider === "openai") {
    return {
      provider: "openai",
      model,
      payload: normalized.openaiInput,
      apiKey,
      countAssistantTools,
    };
  }

  if (options.provider === "anthropic") {
    return {
      provider: "anthropic",
      model,
      payload: normalized.anthropicMessages,
      system: normalized.system,
      apiKey,
      countAssistantTools,
    };
  }

  return {
    provider: "google",
    model,
    payload: normalized.googleContents,
    system: normalized.system
      ? { role: "system", parts: [{ text: normalized.system }] }
      : undefined,
    apiKey,
    countAssistantTools,
  };
}

export async function countTokens(
  options: CountTokensOptions,
): Promise<CountTokensResult> {
  const input = await normalizeInput(options);
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
