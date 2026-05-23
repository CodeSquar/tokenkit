import { getMethodForStrategy, runLocal } from "../../local/run-local.js";
import type { Message, Method, NormalizedInput } from "../../types/index.js";
import type {
  ContentBlockParam,
  MessageParam,
  ToolResultBlockParam,
  ToolUseBlockParam,
} from "@anthropic-ai/sdk/resources/messages/messages";
import { providerFetch } from "../../utils/fetch.js";
import type { ProviderAdapter } from "../base.js";

interface AnthropicCountTokensResponse {
  input_tokens: number;
}

function toAnthropicMessages(messages: Message[]): MessageParam[] {
  return messages.map((message) => {
    const content: ContentBlockParam[] = [];
    for (const part of message.parts ?? []) {
      if (part.type === "text") {
        content.push({ type: "text", text: part.text });
        continue;
      }
      if (part.type === "tool_call") {
        const toolUse: ToolUseBlockParam = {
          type: "tool_use",
          id: part.id ?? `toolu_${part.name}`,
          name: part.name,
          input: JSON.parse(part.arguments || "{}"),
        };
        content.push(toolUse);
        continue;
      }
      const toolResult: ToolResultBlockParam = {
        type: "tool_result",
        tool_use_id: part.callId,
        content: part.output,
      };
      content.push(toolResult);
    }

    return {
      role: message.role as MessageParam["role"],
      content,
    };
  });
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

  async countViaEndpoint(input: NormalizedInput): Promise<number> {
    const body: Record<string, unknown> = {
      model: input.model,
      messages: toAnthropicMessages(
        input.messages.map((message) => ({
          ...message,
          parts: (message.parts ?? []).filter((part) => {
            if (input.countAssistantTools) {
              return true;
            }
            return part.type === "text";
          }),
        })),
      ),
    };

    if (input.system) {
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

  countViaLocal(input: NormalizedInput): number {
    return runLocal(this.localStrategy, input);
  },
};
