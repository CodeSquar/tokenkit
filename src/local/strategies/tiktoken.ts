import { encoding_for_model } from "tiktoken";
import { resolveModelCatalog } from "../../models/resolve-model.js";
import type { NormalizedInput } from "../../types/index.js";
import { flattenMessages } from "../../utils/messages.js";

const TOKENS_PER_MESSAGE = 3;
const TOKENS_PER_NAME = 1;

function resolveEncodingModel(model: string): string {
  const entry = resolveModelCatalog("openai", model);
  if (entry?.tiktokenEncoding) {
    return entry.tiktokenEncoding;
  }

  const lower = model.toLowerCase();
  if (lower.startsWith("gpt-4o-mini")) return "gpt-4o-mini";
  if (lower.startsWith("gpt-4o")) return "gpt-4o";
  if (lower.startsWith("gpt-4")) return "gpt-4";
  if (lower.startsWith("gpt-3.5-turbo")) return "gpt-3.5-turbo";
  return model;
}

function isChatModel(model: string): boolean {
  const entry = resolveModelCatalog("openai", model);
  if (typeof entry?.isChatModel === "boolean") {
    return entry.isChatModel;
  }

  const resolved = resolveEncodingModel(model);
  return resolved.startsWith("gpt-");
}

export function countTiktoken(input: NormalizedInput): number {
  const encodingModel = resolveEncodingModel(input.model);
  let enc;
  try {
    enc = encoding_for_model(
      encodingModel as Parameters<typeof encoding_for_model>[0],
    );
  } catch {
    enc = encoding_for_model("gpt-4o");
  }

  try {
    if (!isChatModel(input.model)) {
      const text = flattenMessages(input.messages, input.system);
      return enc.encode(text).length;
    }

    let tokens = 0;
    if (input.system) {
      tokens += TOKENS_PER_MESSAGE;
      tokens += enc.encode(input.system).length;
    }

    for (const message of input.messages) {
      tokens += TOKENS_PER_MESSAGE;
      tokens += enc.encode(message.content).length;
      if (message.name) {
        tokens += enc.encode(message.name).length;
        tokens += TOKENS_PER_NAME;
      }
    }

    tokens += 3;
    return tokens;
  } finally {
    enc.free();
  }
}
