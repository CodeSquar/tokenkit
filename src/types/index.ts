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
export type InputMode = "provider" | "text" | "ai_sdk";

interface BaseCountTokensOptions {
  model: string;
  mode?: CountMode;
  inputMode?: InputMode;
  apiKey?: string;
  countAssistantTools?: boolean;
}

export interface OpenAICountTokensOptions extends BaseCountTokensOptions {
  provider: "openai";
  input?: string | ResponseInput;
  aiSdkMessages?: ModelMessage[];
  uiMessages?: UIMessage[];
}

export interface AnthropicCountTokensOptions extends BaseCountTokensOptions {
  provider: "anthropic";
  input?: string;
  messages?: MessageParam[];
  aiSdkMessages?: ModelMessage[];
  uiMessages?: UIMessage[];
  system?: string;
}

export interface GoogleCountTokensOptions extends BaseCountTokensOptions {
  provider: "google";
  input?: string;
  contents?: Content[];
  aiSdkMessages?: ModelMessage[];
  uiMessages?: UIMessage[];
  systemInstruction?: Content;
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
