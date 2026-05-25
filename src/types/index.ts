export type Provider = "openai" | "anthropic" | "google";
import type { ResponseInput } from "openai/resources/responses/responses";
import type { Content } from "@google/genai";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";
import type { ModelMessage, UIMessage } from "ai";

export type CountMode = "auto" | "endpoint" | "local";

export type Method =
  | "provider_endpoint"
  | "local_tiktoken"
  | "local_anthropic"
  | "local_heuristic";

export type LocalStrategy =
  | "tiktoken"
  | "anthropic_tokenizer"
  | "heuristic";

export type OpenAIContent = string | ResponseInput | ModelMessage[] | UIMessage[];

export type AnthropicContent = string | MessageParam[] | ModelMessage[] | UIMessage[];

export type GoogleContent = string | Content[] | ModelMessage[] | UIMessage[];

interface BaseCountTokensOptions {
  model: string;
  mode?: CountMode;
  apiKey?: string;
  countAssistantTools?: boolean;
  system?: string;
  systemInstruction?: Content;
}

export interface OpenAICountTokensOptions extends BaseCountTokensOptions {
  provider: "openai";
  content: OpenAIContent;
}

export interface AnthropicCountTokensOptions extends BaseCountTokensOptions {
  provider: "anthropic";
  content: AnthropicContent;
}

export interface GoogleCountTokensOptions extends BaseCountTokensOptions {
  provider: "google";
  content: GoogleContent;
}

export type CountTokensOptions =
  | OpenAICountTokensOptions
  | AnthropicCountTokensOptions
  | GoogleCountTokensOptions;

export type EstimateTokensOptions =
  | Omit<OpenAICountTokensOptions, "mode">
  | Omit<AnthropicCountTokensOptions, "mode">
  | Omit<GoogleCountTokensOptions, "mode">;

export interface PriceEstimate {
  usd: number;
}

export interface CountTokensResult {
  provider: Provider;
  model: string;
  tokens: number;
  estimated: boolean;
  method: Method;
  price: PriceEstimate | null;
}

export interface NormalizedInput {
  provider: CountTokensOptions["provider"];
  model: string;
  apiKey?: string;
  countAssistantTools: boolean;
}

export interface OpenAINormalizedInput extends NormalizedInput {
  provider: "openai";
  payload: string | ResponseInput;
}

export interface AnthropicNormalizedInput extends NormalizedInput {
  provider: "anthropic";
  payload: MessageParam[];
  system?: string;
}

export interface GoogleNormalizedInput extends NormalizedInput {
  provider: "google";
  payload: Content[];
  system?: Content;
}

export type AnyNormalizedInput =
  | OpenAINormalizedInput
  | AnthropicNormalizedInput
  | GoogleNormalizedInput;

export interface CalculatePriceOptions {
  provider: Provider;
  model: string;
  tokens: number;
}

export interface HeuristicInput {
  text: string;
  countAssistantTools?: boolean;
}
