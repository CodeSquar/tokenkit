import { getMethodForStrategy, runLocal } from "../../local/run-local.js";
import type { Method } from "../../types/index.js";
import type { MessageParam, MessageCountTokensParams } from "@anthropic-ai/sdk/resources/messages/messages";
import { providerFetch } from "../../utils/fetch.js";
import { filterAnthropicMessages } from "../../utils/native.js";
import type { ProviderAdapter } from "../base.js";
import type { AnyNormalizedInput } from "../../types/index.js";

interface AnthropicCountTokensResponse {
  input_tokens: number;
}

export const anthropicAdapter: ProviderAdapter = {
  id: "anthropic",
  localStrategy: "anthropic_tokenizer",

  supportsEndpoint() {
    return true;
  },

  getLocalMethod(): Method {
    return getMethodForStrategy(this.localStrategy);
  },

  async countViaEndpoint(input: AnyNormalizedInput): Promise<number> {
    if (input.provider !== "anthropic") {
      throw new Error("Invalid Anthropic provider input.");
    }
    if (!Array.isArray(input.payload)) {
      throw new Error("Invalid Anthropic payload in adapter.");
    }

    const body: MessageCountTokensParams = {
      model: input.model,
      messages: filterAnthropicMessages(
        input.payload as MessageParam[],
        input.countAssistantTools,
      ),
    };

    if (typeof input.system === "string" && input.system.length > 0) {
      body.system = input.system;
    }

    const response = await providerFetch<AnthropicCountTokensResponse>({
      url: "https://api.anthropic.com/v1/messages/count_tokens",
      headers: {
        "x-api-key": input.apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body,
      provider: "anthropic",
    });

    return response.input_tokens;
  },

  async countViaLocal(input: AnyNormalizedInput): Promise<number> {
    return runLocal(this.localStrategy, input);
  },
};
