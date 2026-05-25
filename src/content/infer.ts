import type { Content } from "@google/genai";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";
import type { ResponseInput } from "openai/resources/responses/responses";
import type { Provider } from "../types/index.js";
import type { ModelMessage, UIMessage } from "ai";

export type InferredContentKind =
  | "text"
  | "ui"
  | "messages"
  | "openai-native"
  | "anthropic-native"
  | "google-native";

const AI_SDK_PART_TYPES = new Set(["tool-call", "tool-result", "reasoning", "file"]);

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isUIMessageItem(item: unknown): item is UIMessage {
  if (!isObject(item) || !("role" in item) || !("parts" in item) || !Array.isArray(item.parts)) {
    return false;
  }
  if (item.parts.length === 0) return true;
  return item.parts.every((part) => isObject(part) && "type" in part);
}

function isUIMessageArray(value: unknown[]): value is UIMessage[] {
  return value.length > 0 && value.every(isUIMessageItem);
}

function isGoogleContentItem(item: unknown): item is Content {
  return isObject(item) && "parts" in item && Array.isArray(item.parts) && !isUIMessageItem(item);
}

function isGoogleContentArray(value: unknown[]): value is Content[] {
  return value.length > 0 && value.every(isGoogleContentItem);
}

function hasOpenAIFunctionItems(value: unknown[]): boolean {
  return value.some(
    (item) => isObject(item) && "type" in item && !("role" in item),
  );
}

function hasAISdkToolParts(content: unknown): boolean {
  if (!Array.isArray(content)) return false;
  return content.some(
    (part) => isObject(part) && typeof part.type === "string" && AI_SDK_PART_TYPES.has(part.type),
  );
}

function isModelMessageItem(item: unknown): item is ModelMessage {
  if (!isObject(item) || !("role" in item) || typeof item.role !== "string") {
    return false;
  }
  if (item.role === "tool") return true;
  if (!("content" in item)) return false;
  return hasAISdkToolParts(item.content);
}

function isModelMessageArray(value: unknown[]): value is ModelMessage[] {
  if (value.length === 0) return false;
  if (value.some(isModelMessageItem)) return true;
  return value.every(
    (item) =>
      isObject(item)
      && "role" in item
      && "content" in item
      && !("parts" in item),
  ) && value.some((item) => isObject(item) && item.role === "system");
}

function isGoogleModelMessageArray(value: unknown[]): boolean {
  return (
    value.length > 0
    && value.every(
      (item) =>
        isObject(item)
        && "role" in item
        && "content" in item
        && !("parts" in item),
    )
  );
}

function isAnthropicNativeArray(value: unknown[]): value is MessageParam[] {
  return value.every(
    (item) =>
      isObject(item)
      && "role" in item
      && "content" in item
      && !("parts" in item),
  );
}

function isOpenAIResponseInput(value: unknown[]): value is ResponseInput {
  return value.length > 0;
}

export function inferContentKind(
  content: unknown,
  provider: Provider,
): InferredContentKind {
  if (typeof content === "string") {
    return "text";
  }

  if (!Array.isArray(content)) {
    return "text";
  }

  if (isUIMessageArray(content)) {
    return "ui";
  }

  if (provider === "google" && isGoogleContentArray(content)) {
    return "google-native";
  }

  if (provider === "google" && isGoogleModelMessageArray(content)) {
    return "messages";
  }

  if (hasOpenAIFunctionItems(content)) {
    return "openai-native";
  }

  if (isModelMessageArray(content)) {
    return "messages";
  }

  if (provider === "openai" && isOpenAIResponseInput(content)) {
    return "openai-native";
  }

  if (provider === "anthropic" && isAnthropicNativeArray(content)) {
    return "anthropic-native";
  }

  if (provider === "google" && content.length > 0) {
    return "google-native";
  }

  return "openai-native";
}
