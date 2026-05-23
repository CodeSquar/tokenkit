import { countTokens } from "./count-tokens.js";
import type {
  CountTokensOptions,
  CountTokensResult,
  EstimateTokensOptions,
} from "./types/index.js";

export async function estimateTokens(
  options: EstimateTokensOptions,
): Promise<CountTokensResult> {
  return countTokens({
    ...options,
    mode: "local",
  } as CountTokensOptions);
}
