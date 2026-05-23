import { getMethodForStrategy, runLocal } from "../../local/run-local.js";
import type { AnyNormalizedInput, Method } from "../../types/index.js";
import { providerFetch } from "../../utils/fetch.js";
import { filterOpenAIInput } from "../../utils/native.js";
import type { ProviderAdapter } from "../base.js";

interface OpenAIInputTokensResponse {
  input_tokens: number;
}

export const openaiAdapter: ProviderAdapter = {
  id: "openai",
  localStrategy: "tiktoken",

  supportsEndpoint() {
    return true;
  },

  getLocalMethod(): Method {
    return getMethodForStrategy(this.localStrategy);
  },

  async countViaEndpoint(input: AnyNormalizedInput): Promise<number> {
    if (input.provider !== "openai") {
      throw new Error("Invalid OpenAI provider input.");
    }

    const payload = input.payload;
    if (typeof payload !== "string" && !Array.isArray(payload)) {
      throw new Error("Invalid OpenAI payload in adapter.");
    }

    const body: Record<string, unknown> = {
      model: input.model,
      input: filterOpenAIInput(payload, input.countAssistantTools),
    };

    const response = await providerFetch<OpenAIInputTokensResponse>({
      url: "https://api.openai.com/v1/responses/input_tokens",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
      },
      body,
      provider: "openai",
    });

    return response.input_tokens;
  },

  countViaLocal(input: AnyNormalizedInput): number {
    return runLocal(this.localStrategy, input);
  },
};
