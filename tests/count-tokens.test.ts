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
        input: "",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("accepts text mode for anthropic", async () => {
    const result = await countTokens({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      inputMode: "text",
      input: "Hello from text mode",
      mode: "local",
    });

    expect(result.tokens).toBeGreaterThan(0);
  });

  it("accepts text mode for google", async () => {
    const result = await countTokens({
      provider: "google",
      model: "gemini-2.0-flash",
      inputMode: "text",
      input: "Hello from text mode",
      mode: "local",
    });

    expect(result.tokens).toBeGreaterThan(0);
  });

  it("throws in text mode when input is missing", async () => {
    await expect(
      countTokens({
        provider: "google",
        model: "gemini-2.0-flash",
        inputMode: "text",
        mode: "local",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws when mixing input with provider mode for google", async () => {
    await expect(
      countTokens({
        provider: "google",
        model: "gemini-2.0-flash",
        inputMode: "provider",
        input: "invalid",
        contents: [{ role: "user", parts: [{ text: "Hello" }] }],
        mode: "local",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws when provider mode payload is missing", async () => {
    await expect(
      countTokens({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        inputMode: "provider",
        mode: "local",
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
      input: "Hello",
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
        input: "Hello",
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
      contents: [{ role: "user", parts: [{ text: "Test" }] }],
      apiKey: "should-not-be-used",
    });

    expect(result.estimated).toBe(true);
    expect(result.method).toBe("local_heuristic");
    expect(fetch).not.toHaveBeenCalled();
  });

  it("defaults countAssistantTools to true", async () => {
    const input = [
      { role: "assistant" as const, content: "Checking weather." },
      {
        type: "function_call" as const,
        call_id: "call_1",
        name: "get_weather",
        arguments: "{\"city\":\"Paris\"}",
      },
    ];

    const omitted = await countTokens({
      provider: "openai",
      model: "gpt-4o",
      input,
      mode: "local",
    });

    const explicitTrue = await countTokens({
      provider: "openai",
      model: "gpt-4o",
      input,
      mode: "local",
      countAssistantTools: true,
    });

    const explicitFalse = await countTokens({
      provider: "openai",
      model: "gpt-4o",
      input,
      mode: "local",
      countAssistantTools: false,
    });

    expect(omitted.tokens).toBe(explicitTrue.tokens);
    expect(explicitFalse.tokens).toBeLessThan(explicitTrue.tokens);
  });
});
