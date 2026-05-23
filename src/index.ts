export { countTokens } from "./count-tokens.js";
export { estimateTokens } from "./estimate-tokens.js";
export { calculatePrice, calculatePriceForProvider } from "./calculate-price.js";
export { countHeuristic } from "./local/strategies/heuristic.js";

export type {
  Provider,
  CountMode,
  InputMode,
  Method,
  LocalStrategy,
  OpenAICountTokensOptions,
  AnthropicCountTokensOptions,
  GoogleCountTokensOptions,
  CountTokensOptions,
  EstimateTokensOptions,
  CountTokensResult,
  PriceEstimate,
  CalculatePriceOptions,
  HeuristicInput,
  AnyNormalizedInput,
  OpenAINormalizedInput,
  AnthropicNormalizedInput,
  GoogleNormalizedInput,
} from "./types/index.js";

export {
  TokenKitError,
  ProviderNotSupportedError,
  ModelNotSupportedError,
  MissingApiKeyError,
  EndpointNotAvailableError,
  RateLimitError,
  ValidationError,
} from "./errors/index.js";

export type { ModelMessage, UIMessage } from "ai";
