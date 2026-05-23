import type { Content, Part } from "@google/genai";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";
import type { ModelMessage } from "ai";
import type { ResponseInput, ResponseInputItem } from "openai/resources/responses/responses";
export interface NormalizedAISDKPayload {
  openaiInput: ResponseInput;
  anthropicMessages: MessageParam[];
  googleContents: Content[];
  system?: string;
}

function serializeToolResultOutput(output: unknown): string {
  if (output && typeof output === "object" && "type" in (output as Record<string, unknown>)) {
    const typed = output as Record<string, unknown>;
    if (typed.type === "text" && typeof typed.value === "string") return typed.value;
    if (typed.type === "json") return JSON.stringify(typed.value);
  }
  return JSON.stringify(output);
}

function contentToText(content: ModelMessage["content"]): string {
  if (typeof content === "string") return content;
  return content
    .filter((part) => part.type === "text")
    .map((part) => part.text)
    .join("\n");
}

export function normalizeAISDKMessages(messages: ModelMessage[]): NormalizedAISDKPayload {
  const openaiInput: ResponseInputItem[] = [];
  const anthropicMessages: MessageParam[] = [];
  const googleContents: Content[] = [];
  const systemBlocks: string[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      systemBlocks.push(message.content);
      continue;
    }

    if (message.role === "user") {
      const text = contentToText(message.content);
      openaiInput.push({ role: "user", content: text });
      anthropicMessages.push({ role: "user", content: [{ type: "text", text }] });
      googleContents.push({ role: "user", parts: [{ text }] });
      continue;
    }

    if (message.role === "assistant") {
      if (typeof message.content === "string") {
        openaiInput.push({ role: "assistant", content: message.content });
        anthropicMessages.push({ role: "assistant", content: [{ type: "text", text: message.content }] });
        googleContents.push({ role: "model", parts: [{ text: message.content }] });
        continue;
      }

      const assistantTextParts = message.content
        .filter((part) => part.type === "text" || part.type === "reasoning")
        .map((part) => part.text);
      const assistantText = assistantTextParts.join("\n");
      if (assistantText.length > 0) {
        openaiInput.push({ role: "assistant", content: assistantText });
        anthropicMessages.push({ role: "assistant", content: [{ type: "text", text: assistantText }] });
        googleContents.push({ role: "model", parts: [{ text: assistantText }] });
      }

      const toolCalls = message.content.filter((part) => part.type === "tool-call");
      for (const toolCall of toolCalls) {
        openaiInput.push({
          type: "function_call",
          call_id: toolCall.toolCallId,
          name: toolCall.toolName,
          arguments: JSON.stringify(toolCall.input),
        });
        anthropicMessages.push({
          role: "assistant",
          content: [{ type: "tool_use", id: toolCall.toolCallId, name: toolCall.toolName, input: toolCall.input }],
        });

        const googlePart: Part = {
          functionCall: {
            id: toolCall.toolCallId,
            name: toolCall.toolName,
            args: toolCall.input as Record<string, unknown>,
          },
        };
        googleContents.push({ role: "model", parts: [googlePart] });
      }

      const toolResults = message.content.filter((part) => part.type === "tool-result");
      for (const toolResult of toolResults) {
        openaiInput.push({
          type: "function_call_output",
          call_id: toolResult.toolCallId,
          output: serializeToolResultOutput(toolResult.output),
        });
        anthropicMessages.push({
          role: "user",
          content: [{ type: "tool_result", tool_use_id: toolResult.toolCallId, content: serializeToolResultOutput(toolResult.output) }],
        });

        const googlePart: Part = {
          functionResponse: {
            id: toolResult.toolCallId,
            name: toolResult.toolName,
            response: { output: serializeToolResultOutput(toolResult.output) },
          },
        };
        googleContents.push({ role: "user", parts: [googlePart] });
      }
      continue;
    }

    if (message.role === "tool") {
      for (const toolResult of message.content) {
        if (toolResult.type !== "tool-result") continue;
        openaiInput.push({
          type: "function_call_output",
          call_id: toolResult.toolCallId,
          output: serializeToolResultOutput(toolResult.output),
        });
        anthropicMessages.push({
          role: "user",
          content: [{ type: "tool_result", tool_use_id: toolResult.toolCallId, content: serializeToolResultOutput(toolResult.output) }],
        });

        const googlePart: Part = {
          functionResponse: {
            id: toolResult.toolCallId,
            name: toolResult.toolName,
            response: { output: serializeToolResultOutput(toolResult.output) },
          },
        };
        googleContents.push({ role: "user", parts: [googlePart] });
      }
    }
  }

  return {
    openaiInput,
    anthropicMessages,
    googleContents,
    system: systemBlocks.length > 0 ? systemBlocks.join("\n") : undefined,
  };
}
