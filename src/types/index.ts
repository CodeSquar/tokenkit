export type Provider = "openai" | "anthropic" | "google";

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

export type MessageRole = "user" | "assistant" | "system";

export type TextPart = {
  type: "text";
  text: string;
};

export type ToolCallPart = {
  type: "tool_call";
  id?: string;
  name: string;
  arguments: string;
};

export type ToolOutputPart = {
  type: "tool_output";
  callId: string;
  output: string;
};

export type MessagePart = TextPart | ToolCallPart | ToolOutputPart;

export interface Message {
  role: MessageRole;
  content?: string;
  parts?: MessagePart[];
  name?: string;
}

export interface CountTokensOptions {
  provider: Provider;
  model: string;
  messages?: Message[];
  text?: string;
  mode?: CountMode;
  apiKey?: string;
  system?: string;
  countAssistantTools?: boolean;
}

export type EstimateTokensOptions = Omit<CountTokensOptions, "mode">;

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
  provider: Provider;
  model: string;
  messages: Message[];
  system?: string;
  apiKey?: string;
  countAssistantTools: boolean;
}

export interface CalculatePriceOptions {
  provider: Provider;
  model: string;
  tokens: number;
}

export interface HeuristicInput {
  messages?: Message[];
  text?: string;
  system?: string;
  countAssistantTools?: boolean;
}
