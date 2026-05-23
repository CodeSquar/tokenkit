export class TokenKitError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "TokenKitError";
  }
}

export class ProviderNotSupportedError extends TokenKitError {
  constructor(provider: string) {
    super(`Provider not supported: ${provider}`, "PROVIDER_NOT_SUPPORTED");
    this.name = "ProviderNotSupportedError";
  }
}

export class ModelNotSupportedError extends TokenKitError {
  constructor(model: string, provider?: string) {
    const suffix = provider ? ` for provider ${provider}` : "";
    super(`Model not supported: ${model}${suffix}`, "MODEL_NOT_SUPPORTED");
    this.name = "ModelNotSupportedError";
  }
}

export class MissingApiKeyError extends TokenKitError {
  constructor(provider: string) {
    super(
      `API key required for provider "${provider}". Pass apiKey or set the environment variable.`,
      "MISSING_API_KEY",
    );
    this.name = "MissingApiKeyError";
  }
}

export class EndpointNotAvailableError extends TokenKitError {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message, "ENDPOINT_NOT_AVAILABLE");
    this.name = "EndpointNotAvailableError";
  }
}

export class RateLimitError extends TokenKitError {
  constructor(provider: string) {
    super(`Rate limit exceeded for provider: ${provider}`, "RATE_LIMIT");
    this.name = "RateLimitError";
  }
}

export class ValidationError extends TokenKitError {
  constructor(message: string) {
    super(message, "VALIDATION_ERROR");
    this.name = "ValidationError";
  }
}
