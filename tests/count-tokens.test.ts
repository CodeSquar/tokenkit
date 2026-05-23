import { afterEach, describe, expect, it, vi } from "vitest";
import { countTokens } from "../src/count-tokens.js";
import { estimateTokens } from "../src/estimate-tokens.js";
import { ValidationError } from "../src/errors/index.js";

describe("countTokens", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when input is missing", async () => {
    await expect(
      countTokens({
        provider: "openai",
        model: "gpt-4o",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("auto mode falls back to local on endpoint failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: "Error",
        text: async () => "server error",
      }),
    );

    const result = await countTokens({
      provider: "openai",
      model: "gpt-4o",
      text: "Hello",
      mode: "auto",
      apiKey: "key",
    });

    expect(result.estimated).toBe(true);
    expect(result.method).toBe("local_tiktoken");
    expect(result.tokens).toBeGreaterThan(0);
  });

  it("auto mode throws on client errors instead of falling back to local", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: async () => "invalid model",
      }),
    );

    await expect(
      countTokens({
        provider: "openai",
        model: "gpt-4o",
        text: "Hello",
        mode: "auto",
        apiKey: "key",
      }),
    ).rejects.toMatchObject({
      name: "EndpointNotAvailableError",
      status: 400,
    });
  });

  it("estimateTokens forces local mode", async () => {
    vi.stubGlobal("fetch", vi.fn());

    const result = await estimateTokens({
      provider: "google",
      model: "gemini-2.0-flash",
      text: "Test",
      apiKey: "should-not-be-used",
    });

    expect(result.estimated).toBe(true);
    expect(result.method).toBe("local_heuristic");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("estimateTokens ignores endpoint mode at runtime", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await estimateTokens({
      provider: "openai",
      model: "gpt-4o",
      text: "Hello",
      apiKey: "should-not-be-used",
      mode: "endpoint",
    } as Parameters<typeof estimateTokens>[0]);

    expect(result.estimated).toBe(true);
    expect(result.method).toBe("local_tiktoken");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns price null when model not in pricing table", async () => {
    const result = await countTokens({
      provider: "openai",
      model: "gpt-4o",
      text: "x",
      mode: "local",
    });
    expect(result.price).not.toBeNull();

    const unknown = await countTokens({
      provider: "openai",
      model: "totally-unknown-model-id",
      text: "x",
      mode: "local",
    });
    expect(unknown.price).toBeNull();
  });

  it("defaults countAssistantTools to true", async () => {
    const messages = [
      {
        role: "assistant" as const,
        parts: [
          { type: "text" as const, text: "Checking weather." },
          {
            type: "tool_call" as const,
            id: "call_1",
            name: "get_weather",
            arguments: "{\"city\":\"Paris\"}",
          },
        ],
      },
    ];

    const omitted = await countTokens({
      provider: "openai",
      model: "gpt-4o",
      messages,
      mode: "local",
    });

    const explicitTrue = await countTokens({
      provider: "openai",
      model: "gpt-4o",
      messages,
      mode: "local",
      countAssistantTools: true,
    });

    const explicitFalse = await countTokens({
      provider: "openai",
      model: "gpt-4o",
      messages,
      mode: "local",
      countAssistantTools: false,
    });

    expect(omitted.tokens).toBe(explicitTrue.tokens);
    expect(explicitFalse.tokens).toBeLessThan(explicitTrue.tokens);
  });
});
