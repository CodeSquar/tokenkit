import type { Content, Part } from "@google/genai";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";
import type { ResponseInput, ResponseInputItem } from "openai/resources/responses/responses";

function safeStringify(value: unknown): string {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function serializeUnknown(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) {
    return value.map(serializeUnknown).filter(Boolean).join("\n");
  }
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    if (typeof obj.text === "string") return obj.text;
    if (typeof obj.output_text === "string") return obj.output_text;
    if ("content" in obj) return serializeUnknown(obj.content);
    if ("input_text" in obj) return serializeUnknown(obj.input_text);
    return safeStringify(obj);
  }
  return String(value);
}

function serializeOpenAIInputItem(item: ResponseInputItem, includeTools: boolean): string {
  const raw = item as unknown as Record<string, unknown>;
  const type = raw.type;

  if (type === "function_call") {
    if (!includeTools) return "";
    return `function_call:${safeStringify(raw.name)}(${safeStringify(raw.arguments)})`;
  }

  if (type === "function_call_output") {
    if (!includeTools) return "";
    return `function_call_output:${safeStringify(raw.call_id)}=${serializeUnknown(raw.output)}`;
  }

  return serializeUnknown(item);
}

export function filterOpenAIInput(input: string | ResponseInput, includeTools: boolean): string | ResponseInput {
  if (typeof input === "string") {
    return input;
  }

  const filtered = input
    .map((item) => {
      const raw = item as unknown as Record<string, unknown>;
      const type = raw.type;
      if (!includeTools && (type === "function_call" || type === "function_call_output")) {
        return null;
      }
      return item;
    })
    .filter((item): item is ResponseInputItem => item !== null);

  return filtered;
}

export function openAIInputToText(input: string | ResponseInput, includeTools: boolean): string {
  if (typeof input === "string") {
    return input;
  }

  return input
    .map((item) => serializeOpenAIInputItem(item, includeTools))
    .filter((value) => value !== "")
    .join("\n");
}

export function filterAnthropicMessages(messages: MessageParam[], includeTools: boolean): MessageParam[] {
  if (includeTools) {
    return messages;
  }

  return messages.map((message) => {
    if (!Array.isArray(message.content)) {
      return message;
    }

    return {
      ...message,
      content: message.content.filter((block) => {
        return block.type !== "tool_use" && block.type !== "tool_result";
      }),
    };
  });
}

export function anthropicMessagesToText(
  messages: MessageParam[],
  system: string | undefined,
  includeTools: boolean,
): string {
  const parts: string[] = [];

  if (typeof system === "string" && system.length > 0) {
    parts.push(system);
  }

  for (const message of filterAnthropicMessages(messages, includeTools)) {
    const content = Array.isArray(message.content)
      ? message.content
          .map((block) => {
            if (block.type === "text") {
              return block.text;
            }
            if (block.type === "tool_use") {
              return includeTools
                ? `tool_use:${block.name}(${safeStringify(block.input)})`
                : "";
            }
            if (block.type === "tool_result") {
              return includeTools
                ? `tool_result:${block.tool_use_id}=${serializeUnknown(block.content)}`
                : "";
            }
            return serializeUnknown(block);
          })
          .filter((value) => value !== "")
          .join("\n")
      : serializeUnknown(message.content);

    parts.push(`${message.role}: ${content}`);
  }

  return parts.join("\n");
}

function isToolPart(part: Part): boolean {
  return "functionCall" in part || "functionResponse" in part;
}

export function filterGoogleContents(contents: Content[], includeTools: boolean): Content[] {
  if (includeTools) {
    return contents;
  }

  return contents.map((content) => {
    if (!Array.isArray(content.parts)) {
      return content;
    }

    return {
      ...content,
      parts: content.parts.filter((part) => !isToolPart(part)),
    };
  });
}

export function googleContentsToText(
  contents: Content[],
  systemInstruction: Content | undefined,
  includeTools: boolean,
): string {
  const parts: string[] = [];

  if (systemInstruction) {
    const systemText = Array.isArray(systemInstruction.parts)
      ? systemInstruction.parts.map((part) => serializeUnknown(part)).join("\n")
      : serializeUnknown(systemInstruction);
    if (systemText) {
      parts.push(`system: ${systemText}`);
    }
  }

  for (const content of filterGoogleContents(contents, includeTools)) {
    const line = (content.parts ?? [])
      .map((part) => {
        if ("text" in part && typeof part.text === "string") {
          return part.text;
        }
        if ("functionCall" in part) {
          if (!includeTools) return "";
          return `functionCall:${safeStringify(part.functionCall?.name)}(${safeStringify(part.functionCall?.args)})`;
        }
        if ("functionResponse" in part) {
          if (!includeTools) return "";
          return `functionResponse:${safeStringify(part.functionResponse?.id)}=${safeStringify(part.functionResponse?.response)}`;
        }
        return serializeUnknown(part);
      })
      .filter((value) => value !== "")
      .join("\n");

    parts.push(`${content.role ?? "user"}: ${line}`);
  }

  return parts.join("\n");
}
