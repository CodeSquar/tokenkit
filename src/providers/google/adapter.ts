import { getMethodForStrategy, runLocal } from "../../local/run-local.js";
import type { Message, Method, NormalizedInput } from "../../types/index.js";
import type { Content, FunctionCall, FunctionResponse, Part } from "@google/genai";
import { providerFetch } from "../../utils/fetch.js";
import type { ProviderAdapter } from "../base.js";

interface GeminiCountTokensResponse {
  totalTokens: number;
}

function toGeminiContents(messages: Message[]): Content[] {
  return messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: (message.parts ?? []).reduce<Part[]>((acc, part) => {
      if (part.type === "text") {
        acc.push({ text: part.text });
        return acc;
      }
      if (part.type === "tool_call") {
        const functionCall: FunctionCall = {
          id: part.id,
          name: part.name,
          args: JSON.parse(part.arguments || "{}"),
        };
        acc.push({
          functionCall,
        });
        return acc;
      }
      const functionResponse: FunctionResponse = {
        id: part.callId,
        name: "tool_result",
        response: { output: part.output },
      };
      acc.push({
        functionResponse,
      });
      return acc;
    }, []),
  }));
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

  async countViaEndpoint(input: NormalizedInput): Promise<number> {
    const model = encodeURIComponent(input.model);
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:countTokens?key=${encodeURIComponent(input.apiKey!)}`;

    const contents = toGeminiContents(
      input.messages.map((message) => ({
        ...message,
        parts: (message.parts ?? []).filter((part) => {
          if (input.countAssistantTools) {
            return true;
          }
          return part.type === "text";
        }),
      })),
    );
    const body: Record<string, unknown> = { contents };

    if (input.system) {
      body.systemInstruction = { parts: [{ text: input.system }] };
    }

    const response = await providerFetch<GeminiCountTokensResponse>({
      url,
      body,
      provider: "google",
    });

    return response.totalTokens;
  },

  countViaLocal(input: NormalizedInput): number {
    return runLocal(this.localStrategy, input);
  },
};
