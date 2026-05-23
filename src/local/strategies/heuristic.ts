import type { HeuristicInput } from "../../types/index.js";
import {
  flattenMessages,
  partitionSystemMessages,
  resolveMessages,
  stringifyMessageParts,
} from "../../utils/messages.js";

const CHARS_PER_TOKEN = 4;
const TOKENS_PER_MESSAGE = 3;

export function countHeuristic(input: HeuristicInput): number {
  const { system, messages } = partitionSystemMessages(
    resolveMessages(input.messages, input.text),
    input.system,
  );
  const filteredMessages = messages.map((message) => {
    const content = stringifyMessageParts(message, {
      includeTools: input.countAssistantTools ?? true,
    });
    return {
      ...message,
      content,
      // Ensure flattenMessages uses this filtered content instead of original parts.
      parts: [{ type: "text" as const, text: content }],
    };
  });
  const text = flattenMessages(filteredMessages, system);
  const baseTokens = Math.ceil(text.length / CHARS_PER_TOKEN);
  const messageOverhead = messages.length * TOKENS_PER_MESSAGE;
  return baseTokens + messageOverhead;
}
