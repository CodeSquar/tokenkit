import type { AnyNormalizedInput, LocalStrategy, Method } from "../types/index.js";
import type { ResponseInput } from "openai/resources/responses/responses";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";
import type { Content } from "@google/genai";
import { countAnthropicLocal } from "./strategies/anthropic.js";
import { countHeuristic } from "./strategies/heuristic.js";
import { countTiktoken } from "./strategies/tiktoken.js";
import {
  anthropicMessagesToText,
  googleContentsToText,
  openAIInputToText,
} from "../utils/native.js";

export function getMethodForStrategy(strategy: LocalStrategy): Method {
  switch (strategy) {
    case "tiktoken":
      return "local_tiktoken";
    case "anthropic_tokenizer":
      return "local_anthropic";
    case "heuristic":
      return "local_heuristic";
  }
}

export async function runLocal(
  strategy: LocalStrategy,
  input: AnyNormalizedInput,
): Promise<number> {
  const text =
    input.provider === "openai"
      ? openAIInputToText(input.payload as string | ResponseInput, input.countAssistantTools)
      : input.provider === "anthropic"
        ? anthropicMessagesToText(
            input.payload as MessageParam[],
            typeof input.system === "string" ? input.system : undefined,
            input.countAssistantTools,
          )
        : googleContentsToText(
            input.payload as Content[],
            input.system as Content | undefined,
            input.countAssistantTools,
          );

  switch (strategy) {
    case "tiktoken":
      return await countTiktoken(input.model, text);
    case "anthropic_tokenizer":
      return await countAnthropicLocal(text);
    case "heuristic":
      return countHeuristic({ text });
  }
}
