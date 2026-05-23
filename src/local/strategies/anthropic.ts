import { LocalTokenizerUnavailableError } from "../../errors/index.js";

type CountAnthropicTokens = (text: string) => number;

interface AnthropicTokenizerModule {
  countTokens?: CountAnthropicTokens;
  default?: {
    countTokens?: CountAnthropicTokens;
  };
}

function errorReason(error: unknown): string | undefined {
  return error instanceof Error && error.message ? error.message : undefined;
}

async function loadAnthropicCountTokens(): Promise<CountAnthropicTokens> {
  try {
    const tokenizer = (await import("@anthropic-ai/tokenizer")) as AnthropicTokenizerModule;
    const countTokens = tokenizer.countTokens ?? tokenizer.default?.countTokens;
    if (typeof countTokens !== "function") {
      throw new Error("countTokens export was not found.");
    }
    return countTokens;
  } catch (error) {
    throw new LocalTokenizerUnavailableError("@anthropic-ai/tokenizer", errorReason(error));
  }
}

export async function countAnthropicLocal(text: string): Promise<number> {
  const countAnthropicTokens = await loadAnthropicCountTokens();
  return countAnthropicTokens(text);
}
