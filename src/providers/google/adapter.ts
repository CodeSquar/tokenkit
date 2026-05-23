import { getMethodForStrategy, runLocal } from "../../local/run-local.js";
import type { AnyNormalizedInput, Method } from "../../types/index.js";
import type { Content } from "@google/genai";
import { providerFetch } from "../../utils/fetch.js";
import { filterGoogleContents } from "../../utils/native.js";
import type { ProviderAdapter } from "../base.js";

interface GeminiCountTokensResponse {
  totalTokens: number;
}

export const googleAdapter: ProviderAdapter = {
  id: "google",
  localStrategy: "heuristic",

  supportsEndpoint() {
    return true;
  },

  getLocalMethod(): Method {
    return getMethodForStrategy(this.localStrategy);
  },

  async countViaEndpoint(input: AnyNormalizedInput): Promise<number> {
    if (input.provider !== "google") {
      throw new Error("Invalid Google provider input.");
    }
    if (!Array.isArray(input.payload)) {
      throw new Error("Invalid Google payload in adapter.");
    }

    const model = encodeURIComponent(input.model);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:countTokens?key=${encodeURIComponent(input.apiKey!)}`;
    const contents = filterGoogleContents(
      input.payload as Content[],
      input.countAssistantTools,
    );
    const body: Record<string, unknown> = input.system
      ? {
          generateContentRequest: {
            model: `models/${input.model}`,
            contents,
            systemInstruction: input.system,
          },
        }
      : { contents };

    const response = await providerFetch<GeminiCountTokensResponse>({
      url,
      body,
      provider: "google",
    });

    return response.totalTokens;
  },

  countViaLocal(input: AnyNormalizedInput): number {
    return runLocal(this.localStrategy, input);
  },
};
