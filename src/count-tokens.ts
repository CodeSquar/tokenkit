import { calculatePrice } from "./calculate-price.js";
import { inferContentKind } from "./content/infer.js";
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
import type { ResponseInput } from "openai/resources/responses/responses";
import { resolveApiKey } from "./utils/env.js";
import type { ModelMessage, UIMessage } from "ai";
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

function googleSystemFromString(system: string): Content {
  return { role: "system", parts: [{ text: system }] };
}

function normalizeTextContent(
  options: CountTokensOptions,
  text: string,
): AnyNormalizedInput {
  const model = ensureNonEmptyString(options.model, "model");
  const value = ensureNonEmptyString(text, "content");
  const countAssistantTools = options.countAssistantTools ?? true;
  const apiKey = resolveApiKey(options.provider, options.apiKey);

  if (options.provider === "openai") {
    if (options.system !== undefined) {
      invalid("system", "is not allowed for OpenAI text content");
    }
    return {
      provider: "openai",
      model,
      payload: value,
      apiKey,
      countAssistantTools,
    };
  }

  if (options.provider === "anthropic") {
    if (options.system !== undefined && typeof options.system !== "string") {
      invalid("system", "must be a string");
    }
    return {
      provider: "anthropic",
      model,
      payload: [{ role: "user", content: [{ type: "text", text: value }] }],
      system: options.system,
      apiKey,
      countAssistantTools,
    };
  }

  if (options.system !== undefined && typeof options.system !== "string") {
    invalid("system", "must be a string");
  }
  return {
    provider: "google",
    model,
    payload: [{ role: "user", parts: [{ text: value }] }],
    system: options.system ? googleSystemFromString(options.system) : undefined,
    apiKey,
    countAssistantTools,
  };
}

function normalizeOpenAINativeContent(
  options: CountTokensOptions,
  content: string | ResponseInput,
): AnyNormalizedInput {
  const model = ensureNonEmptyString(options.model, "model");
  const countAssistantTools = options.countAssistantTools ?? true;
  const apiKey = resolveApiKey(options.provider, options.apiKey);

  if (typeof content === "string") {
    if (content.trim() === "") {
      invalid("content", "must be a non-empty string when it is a string");
    }
    return {
      provider: "openai",
      model,
      payload: content,
      apiKey,
      countAssistantTools,
    };
  }

  const input = ensureArray(content, "content") as ResponseInput;
  if (input.length === 0) {
    invalid("content", "must include at least one item");
  }

  return {
    provider: "openai",
    model,
    payload: input,
    apiKey,
    countAssistantTools,
  };
}

function normalizeAnthropicNativeContent(
  options: CountTokensOptions,
  messages: MessageParam[],
): AnyNormalizedInput {
  const model = ensureNonEmptyString(options.model, "model");
  const countAssistantTools = options.countAssistantTools ?? true;
  const apiKey = resolveApiKey(options.provider, options.apiKey);

  if (messages.length === 0) {
    invalid("content", "must include at least one message");
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

function normalizeGoogleNativeContent(
  options: CountTokensOptions,
  contents: Content[],
): AnyNormalizedInput {
  const model = ensureNonEmptyString(options.model, "model");
  const countAssistantTools = options.countAssistantTools ?? true;
  const apiKey = resolveApiKey(options.provider, options.apiKey);

  if (contents.length === 0) {
    invalid("content", "must include at least one content item");
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
    invalid("model", `is not present in tokens-usage catalog for provider "${provider}"`);
  }
  if (!isAISdkModelSupported(provider, model)) {
    invalid("model", `is not supported by AI SDK for provider "${provider}"`);
  }
}

function isModuleNotFound(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const withCode = error as Error & { code?: string };
  if (withCode.code === "ERR_MODULE_NOT_FOUND") return true;
  return /Cannot find module|ERR_MODULE_NOT_FOUND/i.test(error.message);
}

async function convertUiMessagesToModelMessages(
  uiMessages: UIMessage[],
): Promise<ModelMessage[]> {
  try {
    const aiSdk = await import("ai");
    return (await aiSdk.convertToModelMessages(uiMessages as never[])) as ModelMessage[];
  } catch (error) {
    if (isModuleNotFound(error)) {
      invalid(
        "content",
        "UIMessage[] requires the optional peer dependency \"ai\". Install it with: npm install ai",
      );
    }
    throw error;
  }
}

function normalizeMessagesFromModelMessages(
  options: CountTokensOptions,
  aiSdkMessages: ModelMessage[],
): AnyNormalizedInput {
  const model = ensureNonEmptyString(options.model, "model");
  const countAssistantTools = options.countAssistantTools ?? true;
  const apiKey = resolveApiKey(options.provider, options.apiKey);

  ensureAiSdkModelAllowed(options.provider, model);

  if (aiSdkMessages.length === 0) {
    invalid("content", "must include at least one message");
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
      ? googleSystemFromString(normalized.system)
      : undefined,
    apiKey,
    countAssistantTools,
  };
}

async function normalizeFromContent(options: CountTokensOptions): Promise<AnyNormalizedInput> {
  if (options.content === undefined || options.content === null) {
    invalid("content", "is required");
  }

  if (typeof options.content !== "string" && !Array.isArray(options.content)) {
    invalid("content", "must be a string or an array");
  }

  const kind = inferContentKind(options.content, options.provider);

  switch (kind) {
    case "text":
      return normalizeTextContent(options, options.content as string);
    case "openai-native":
      if (options.provider !== "openai") {
        invalid("content", `is not valid native payload for provider "${options.provider}"`);
      }
      return normalizeOpenAINativeContent(options, options.content as string | ResponseInput);
    case "anthropic-native":
      if (options.provider !== "anthropic") {
        invalid("content", `is not valid native payload for provider "${options.provider}"`);
      }
      return normalizeAnthropicNativeContent(options, options.content as MessageParam[]);
    case "google-native":
      if (options.provider !== "google") {
        invalid("content", `is not valid native payload for provider "${options.provider}"`);
      }
      return normalizeGoogleNativeContent(options, options.content as Content[]);
    case "messages":
      return normalizeMessagesFromModelMessages(options, options.content as ModelMessage[]);
    case "ui": {
      const uiMessages = ensureArray(options.content, "content") as UIMessage[];
      if (uiMessages.length === 0) {
        invalid("content", "must include at least one message");
      }
      const aiSdkMessages = await convertUiMessagesToModelMessages(uiMessages);
      return normalizeMessagesFromModelMessages(options, aiSdkMessages);
    }
  }
}

export async function countTokens(
  options: CountTokensOptions,
): Promise<CountTokensResult> {
  const input = await normalizeFromContent(options);
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
