import { countTokens as countAnthropicTokens } from "@anthropic-ai/tokenizer";
import type { NormalizedInput } from "../../types/index.js";
import { flattenMessages, stringifyMessageParts } from "../../utils/messages.js";

export function countAnthropicLocal(input: NormalizedInput): number {
  const text = flattenMessages(
    input.messages.map((message) => ({
      ...message,
      content: stringifyMessageParts(message, {
        includeTools: input.countAssistantTools,
      }),
    })),
    input.system,
  );
  return countAnthropicTokens(text);
}
