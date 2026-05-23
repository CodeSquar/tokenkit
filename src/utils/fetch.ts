import {
  EndpointNotAvailableError,
  MissingApiKeyError,
  RateLimitError,
} from "../errors/index.js";

export interface ProviderFetchOptions {
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
  provider: string;
  timeoutMs?: number;
}

export async function providerFetch<T>({
  url,
  method = "POST",
  headers = {},
  body,
  provider,
  timeoutMs = 30_000,
}: ProviderFetchOptions): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });

    if (response.status === 401) {
      throw new MissingApiKeyError(provider);
    }
    if (response.status === 429) {
      throw new RateLimitError(provider);
    }
    if (!response.ok) {
      const errorText = await response.text().catch(() => "");
      throw new EndpointNotAvailableError(
        `${provider} API error (${response.status}): ${errorText || response.statusText}`,
        response.status,
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof MissingApiKeyError || error instanceof RateLimitError) {
      throw error;
    }
    if (error instanceof EndpointNotAvailableError) {
      throw error;
    }
    if (error instanceof Error && error.name === "AbortError") {
      throw new EndpointNotAvailableError(
        `${provider} API request timed out after ${timeoutMs}ms`,
      );
    }
    throw new EndpointNotAvailableError(
      `${provider} API request failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

export function isRetryableEndpointError(error: unknown): boolean {
  if (error instanceof RateLimitError) {
    return true;
  }
  if (error instanceof EndpointNotAvailableError) {
    if (error.status === undefined) {
      return true;
    }
    return error.status >= 500 || error.status === 408;
  }
  return false;
}
