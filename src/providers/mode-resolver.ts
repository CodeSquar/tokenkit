import { MissingApiKeyError } from "../errors/index.js";
import type { AnyNormalizedInput, CountMode, Method } from "../types/index.js";
import { isRetryableEndpointError } from "../utils/fetch.js";
import type { ProviderAdapter } from "./base.js";

export interface CountExecution {
  tokens: number;
  method: Method;
  estimated: boolean;
}

export async function executeCount(
  adapter: ProviderAdapter,
  input: AnyNormalizedInput,
  mode: CountMode,
): Promise<CountExecution> {
  if (mode === "local") {
    return {
      tokens: await adapter.countViaLocal(input),
      method: adapter.getLocalMethod(),
      estimated: true,
    };
  }

  if (mode === "endpoint") {
    if (!input.apiKey) {
      throw new MissingApiKeyError(adapter.id);
    }
    const tokens = await adapter.countViaEndpoint(input);
    return {
      tokens,
      method: "provider_endpoint",
      estimated: false,
    };
  }

  // auto
  if (input.apiKey && adapter.supportsEndpoint()) {
    try {
      const tokens = await adapter.countViaEndpoint(input);
      return {
        tokens,
        method: "provider_endpoint",
        estimated: false,
      };
    } catch (error) {
      if (!isRetryableEndpointError(error)) {
        throw error;
      }
    }
  }

  return {
    tokens: await adapter.countViaLocal(input),
    method: adapter.getLocalMethod(),
    estimated: true,
  };
}
