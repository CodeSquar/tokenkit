export class TokensUsageError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "TokensUsageError";
  }
}

export class ProviderNotSupportedError extends TokensUsageError {
  constructor(provider: string) {
    super(`Provider not supported: ${provider}`, "PROVIDER_NOT_SUPPORTED");
    this.name = "ProviderNotSupportedError";
  }
}

export class ModelNotSupportedError extends TokensUsageError {
  constructor(model: string, provider?: string) {
    const suffix = provider ? ` for provider ${provider}` : "";
    super(`Model not supported: ${model}${suffix}`, "MODEL_NOT_SUPPORTED");
    this.name = "ModelNotSupportedError";
  }
}

export class MissingApiKeyError extends TokensUsageError {
  constructor(provider: string) {
    super(
      `API key required for provider "${provider}". Pass apiKey or set the environment variable.`,
      "MISSING_API_KEY",
    );
    this.name = "MissingApiKeyError";
  }
}

export class EndpointNotAvailableError extends TokensUsageError {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message, "ENDPOINT_NOT_AVAILABLE");
    this.name = "EndpointNotAvailableError";
  }
}

export class RateLimitError extends TokensUsageError {
  constructor(provider: string) {
    super(`Rate limit exceeded for provider: ${provider}`, "RATE_LIMIT");
    this.name = "RateLimitError";
  }
}

export class LocalTokenizerUnavailableError extends TokensUsageError {
  constructor(tokenizer: string, reason?: string) {
    const suffix = reason ? ` Original error: ${reason}` : "";
    super(
      `Local token counting requires "${tokenizer}" and its WASM/assets to be available at runtime.${suffix}`,
      "LOCAL_TOKENIZER_UNAVAILABLE",
    );
    this.name = "LocalTokenizerUnavailableError";
  }
}

export class ValidationError extends TokensUsageError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}
