import { ValidationError } from "../../errors/index.js";
import type { HeuristicInput } from "../../types/index.js";

const CHARS_PER_TOKEN = 4;
const TOKENS_PER_MESSAGE = 3;

export function countHeuristic(input: HeuristicInput): number {
  const text = input.text;
  if (text.trim() === "") {
    throw new ValidationError("text: must be a non-empty string");
  }
  const baseTokens = Math.ceil(text.length / CHARS_PER_TOKEN);
  const lineCount = Math.max(1, text.split("\n").length);
  const messageOverhead = lineCount * TOKENS_PER_MESSAGE;
  return baseTokens + messageOverhead;
}
