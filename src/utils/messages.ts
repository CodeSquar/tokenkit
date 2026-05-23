import type { Message } from "../types/index.js";
import { ValidationError } from "../errors/index.js";

export function textToMessages(text: string): Message[] {
  return [{ role: "user", content: text, parts: [{ type: "text", text }] }];
}

function normalizeMessage(message: Message): Message {
  if (message.parts && message.parts.length > 0) {
    return message;
  }

  if (message.content !== undefined) {
    return {
      ...message,
      parts: [{ type: "text", text: message.content }],
    };
  }

  throw new ValidationError("Each message must include content or parts.");
}

export function resolveMessages(
  messages?: Message[],
  text?: string,
): Message[] {
  if (messages && messages.length > 0) {
    return messages.map(normalizeMessage);
  }
  if (text !== undefined && text !== "") {
    return textToMessages(text);
  }
  throw new ValidationError(
    "Either messages or text must be provided and non-empty.",
  );
}

export function partitionSystemMessages(
  messages: Message[],
  system?: string,
): { system?: string; messages: Message[] } {
  const systemParts: string[] = [];
  if (system) {
    systemParts.push(system);
  }

  const conversationMessages: Message[] = [];
  for (const message of messages) {
    if (message.role === "system") {
      systemParts.push(stringifyMessageParts(message));
    } else {
      conversationMessages.push(message);
    }
  }

  if (conversationMessages.length === 0) {
    throw new ValidationError(
      "At least one non-system message must be provided.",
    );
  }

  return {
    system: systemParts.length > 0 ? systemParts.join("\n") : undefined,
    messages: conversationMessages,
  };
}

export function flattenMessages(messages: Message[], system?: string): string {
  const parts: string[] = [];
  if (system) {
    parts.push(system);
  }
  for (const message of messages) {
    parts.push(`${message.role}: ${stringifyMessageParts(message)}`);
  }
  return parts.join("\n");
}

export function stringifyMessageParts(
  message: Pick<Message, "parts" | "content">,
  options?: { includeTools?: boolean },
): string {
  const includeTools = options?.includeTools ?? true;
  const sourceParts =
    message.parts && message.parts.length > 0
      ? message.parts
      : message.content !== undefined
        ? [{ type: "text" as const, text: message.content }]
        : [];

  const serialized = sourceParts
    .flatMap((part) => {
      if (part.type === "text") {
        return [part.text];
      }

      if (!includeTools) {
        return [];
      }

      if (part.type === "tool_call") {
        return [`tool_call:${part.name}(${part.arguments})`];
      }

      return [`tool_output:${part.callId}=${part.output}`];
    })
    .filter((value) => value !== "");

  return serialized.join("\n");
}
