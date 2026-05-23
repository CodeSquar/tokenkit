import { describe, expect, it } from "vitest";
import { EndpointNotAvailableError, RateLimitError } from "../../src/errors/index.js";
import { isRetryableEndpointError } from "../../src/utils/fetch.js";

describe("isRetryableEndpointError", () => {
  it("returns true for rate limit errors", () => {
    expect(isRetryableEndpointError(new RateLimitError("openai"))).toBe(true);
  });

  it("returns true for network and timeout errors without status", () => {
    expect(
      isRetryableEndpointError(new EndpointNotAvailableError("network failure")),
    ).toBe(true);
  });

  it("returns true for server errors and request timeout", () => {
    expect(
      isRetryableEndpointError(new EndpointNotAvailableError("server error", 500)),
    ).toBe(true);
    expect(
      isRetryableEndpointError(new EndpointNotAvailableError("gateway error", 502)),
    ).toBe(true);
    expect(
      isRetryableEndpointError(new EndpointNotAvailableError("request timeout", 408)),
    ).toBe(true);
  });

  it("returns false for client errors", () => {
    expect(
      isRetryableEndpointError(new EndpointNotAvailableError("bad request", 400)),
    ).toBe(false);
    expect(
      isRetryableEndpointError(new EndpointNotAvailableError("not found", 404)),
    ).toBe(false);
    expect(
      isRetryableEndpointError(new EndpointNotAvailableError("unauthorized", 403)),
    ).toBe(false);
  });
});
