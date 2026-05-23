import { countTokens as countAnthropicTokens } from "@anthropic-ai/tokenizer";

export function countAnthropicLocal(text: string): number {
  return countAnthropicTokens(text);
}
