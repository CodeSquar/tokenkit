import { LocalTokenizerUnavailableError } from "../../errors/index.js";
import { resolveModelCatalog } from "../../models/resolve-model.js";

const TOKENS_PER_MESSAGE = 3;

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

async function loadEncodingForModel() {
  try {
    const tiktoken = await import("tiktoken");
    return tiktoken.encoding_for_model;
  } catch (error) {
    const reason = error instanceof Error && error.message ? error.message : undefined;
    throw new LocalTokenizerUnavailableError("tiktoken", reason);
  }
}

export async function countTiktoken(model: string, text: string): Promise<number> {
  const encodingForModel = await loadEncodingForModel();
  const encodingModel = resolveEncodingModel(model);
  let enc;
  try {
    enc = encodingForModel(encodingModel as Parameters<typeof encodingForModel>[0]);
  } catch {
    enc = encodingForModel("gpt-4o");
  }

  try {
    if (!isChatModel(model)) {
      return enc.encode(text).length;
    }

    const lineCount = Math.max(1, text.split("\n").length);
    return enc.encode(text).length + lineCount * TOKENS_PER_MESSAGE + 3;
  } finally {
    enc.free();
  }
}
