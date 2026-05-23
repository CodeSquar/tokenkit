import { getMethodForStrategy, runLocal } from "../../local/run-local.js";
import type { MessagePart, Method, NormalizedInput } from "../../types/index.js";
import type {
  ResponseFunctionToolCall,
  ResponseInput,
  ResponseInputItem,
} from "openai/resources/responses/responses";
import { providerFetch } from "../../utils/fetch.js";
import type { ProviderAdapter } from "../base.js";

interface OpenAIInputTokensResponse {
  input_tokens: number;
}

function mapPartToInputItem(
  part: MessagePart,
  countAssistantTools: boolean,
): ResponseInputItem[] {
  if (part.type === "text") return [];
  if (!countAssistantTools) {
    return [];
  }
  if (part.type === "tool_call") {
    const callId = part.id ?? `call_${part.name}`;
    const item: ResponseFunctionToolCall = {
      type: "function_call",
      call_id: callId,
      name: part.name,
      arguments: part.arguments,
    };
    return [
      item,
    ];
  }
  const outputItem: ResponseInputItem = {
    type: "function_call_output",
    call_id: part.callId,
    output: part.output,
  };
  return [
    outputItem,
  ];
}

function buildInput(
  input: NormalizedInput,
): string | ResponseInput {
  const firstMessage = input.messages[0];
  const firstPart = firstMessage?.parts?.[0];
  const onlySimpleUserText =
    input.messages.length === 1 &&
    firstMessage?.role === "user" &&
    !input.system &&
    firstMessage?.parts?.length === 1 &&
    firstPart?.type === "text";

  if (onlySimpleUserText && firstPart?.type === "text") {
    return firstPart.text;
  }

  const items: ResponseInput = [];
  if (input.system) {
    items.push({ role: "system", content: input.system });
  }
  for (const message of input.messages) {
    const parts = message.parts ?? [];
    const textParts = parts
      .filter((part) => part.type === "text")
      .map((part) => part.text)
      .join("\n");

    if (textParts) {
      items.push({ role: message.role, content: textParts });
    }

    for (const part of parts) {
      if (part.type === "text") {
        continue;
      }
      items.push(...mapPartToInputItem(part, input.countAssistantTools));
    }
  }
  return items;
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

  async countViaEndpoint(input: NormalizedInput): Promise<number> {
    const body: Record<string, unknown> = {
      model: input.model,
      input: buildInput(input),
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

  countViaLocal(input: NormalizedInput): number {
    return runLocal(this.localStrategy, input);
  },
};
