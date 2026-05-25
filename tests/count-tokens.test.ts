import { afterEach, describe, expect, it, vi } from "vitest";
import { countTokens } from "../src/count-tokens.js";
import { estimateTokens } from "../src/estimate-tokens.js";
import { ValidationError } from "../src/errors/index.js";
import type { CountTokensOptions } from "../src/types/index.js";
import type { ModelMessage } from "ai";

describe("countTokens", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws when content is missing", async () => {
    await expect(
      countTokens({
        provider: "openai",
        model: "gpt-4o",
      } as CountTokensOptions),
    ).rejects.toThrow(ValidationError);
  });

  it("throws when text content is empty", async () => {
    await expect(
      countTokens({
        provider: "openai",
        model: "gpt-4o",
        content: "",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws when content is not a string or array", async () => {
    await expect(
      countTokens({
        provider: "openai",
        model: "gpt-4o",
        content: { text: "hello" } as never,
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws when native payload is empty", async () => {
    await expect(
      countTokens({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        content: [],
        mode: "local",
      }),
    ).rejects.toThrow(ValidationError);
  });

  describe("content shapes (auto-detected)", () => {
    it("counts plain string content for openai", async () => {
      const result = await countTokens({
        provider: "openai",
        model: "gpt-4o",
        content: "Hello from text",
        mode: "local",
      });

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.method).toBe("local_tiktoken");
    });

    it("counts plain string content for anthropic", async () => {
      const result = await countTokens({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        content: "Hello from text mode",
        system: "Be concise",
        mode: "local",
      });

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.method).toBe("local_anthropic");
    });

    it("counts plain string content for google", async () => {
      const result = await countTokens({
        provider: "google",
        model: "gemini-2.0-flash",
        content: "Hello from text mode",
        system: "Be concise",
        mode: "local",
      });

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.method).toBe("local_heuristic");
    });

    it("counts openai native ResponseInput with function calls", async () => {
      const result = await countTokens({
        provider: "openai",
        model: "gpt-4o",
        content: [
          { role: "assistant", content: "Checking weather." },
          {
            type: "function_call",
            call_id: "call_1",
            name: "get_weather",
            arguments: "{\"city\":\"Paris\"}",
          },
        ],
        mode: "local",
      });

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.method).toBe("local_tiktoken");
    });

    it("counts openai native role messages without function calls", async () => {
      const result = await countTokens({
        provider: "openai",
        model: "gpt-4o",
        content: [{ role: "user", content: "Hello native" }],
        mode: "local",
      });

      expect(result.tokens).toBeGreaterThan(0);
    });

    it("counts anthropic native MessageParam[]", async () => {
      const result = await countTokens({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        content: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
        system: "Be concise",
        mode: "local",
      });

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.method).toBe("local_anthropic");
    });

    it("counts google native Content[]", async () => {
      const result = await countTokens({
        provider: "google",
        model: "gemini-2.0-flash",
        content: [{ role: "user", parts: [{ text: "Hello native" }] }],
        mode: "local",
      });

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.method).toBe("local_heuristic");
    });

    it("counts AI SDK ModelMessage[] for openai", async () => {
      const messages: ModelMessage[] = [
        { role: "system", content: "You are concise." },
        { role: "user", content: [{ type: "text", text: "Hello AI SDK" }] },
      ];

      const result = await countTokens({
        provider: "openai",
        model: "gpt-4o",
        content: messages,
        mode: "local",
      });

      expect(result.tokens).toBeGreaterThan(0);
    });

    it("counts AI SDK ModelMessage[] for anthropic", async () => {
      const messages: ModelMessage[] = [
        { role: "user", content: "Hello from AI SDK" },
        {
          role: "assistant",
          content: [{ type: "tool-call", toolCallId: "call_1", toolName: "search", input: { q: "a" } }],
        },
      ];

      const result = await countTokens({
        provider: "anthropic",
        model: "claude-sonnet-4-6",
        content: messages,
        mode: "local",
      });

      expect(result.tokens).toBeGreaterThan(0);
    });

    it("counts AI SDK ModelMessage[] for google", async () => {
      const messages: ModelMessage[] = [
        {
          role: "user",
          content: [
            { type: "text", text: "Hello gemini" },
            { type: "image", image: new URL("https://example.com/x.png") },
          ],
        },
      ];

      const result = await countTokens({
        provider: "google",
        model: "gemini-2.0-flash",
        content: messages,
        mode: "local",
      });

      expect(result.tokens).toBeGreaterThan(0);
    });

    it("counts UIMessage[] when ai peer is available", async () => {
      vi.resetModules();
      vi.doMock("ai", () => ({
        convertToModelMessages: async () => [
          { role: "user", content: [{ type: "text", text: "hello from ui" }] },
        ],
      }));

      const { countTokens: mockedCountTokens } = await import("../src/count-tokens.js");

      const result = await mockedCountTokens({
        provider: "openai",
        model: "gpt-4o",
        content: [{ id: "1", role: "user", parts: [{ type: "text", text: "hello from ui" }] }],
        mode: "local",
      });

      expect(result.tokens).toBeGreaterThan(0);
    });
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
      content: "Hello",
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
        content: "Hello",
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
      content: [{ role: "user", parts: [{ text: "Test" }] }],
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
      content: input,
      mode: "local",
    });

    const explicitTrue = await countTokens({
      provider: "openai",
      model: "gpt-4o",
      content: input,
      mode: "local",
      countAssistantTools: true,
    });

    const explicitFalse = await countTokens({
      provider: "openai",
      model: "gpt-4o",
      content: input,
      mode: "local",
      countAssistantTools: false,
    });

    expect(omitted.tokens).toBe(explicitTrue.tokens);
    expect(explicitFalse.tokens).toBeLessThan(explicitTrue.tokens);
  });

  it("rejects AI SDK messages when model is outside the allowed intersection", async () => {
    const messages: ModelMessage[] = [{ role: "user", content: "hi" }];

    await expect(
      countTokens({
        provider: "google",
        model: "gemini-unknown-x",
        content: messages,
        mode: "local",
      }),
    ).rejects.toThrow(ValidationError);
  });

  it("throws a clear error when UIMessage content is used without ai installed", async () => {
    vi.resetModules();
    vi.doMock("ai", () => ({
      convertToModelMessages: async () => {
        const error = new Error("Cannot find module 'ai'") as Error & { code?: string };
        error.code = "ERR_MODULE_NOT_FOUND";
        throw error;
      },
    }));

    const { countTokens: mockedCountTokens } = await import("../src/count-tokens.js");

    await expect(
      mockedCountTokens({
        provider: "openai",
        model: "gpt-4o",
        content: [{ id: "1", role: "user", parts: [{ type: "text", text: "hello" }] }],
        mode: "local",
      }),
    ).rejects.toThrow(/requires the optional peer dependency "ai"/i);
  });

  it("satisfies CountTokensOptions for all content shapes", () => {
    const textOpenAI = {
      provider: "openai",
      model: "gpt-4o",
      content: "Hello",
    } satisfies CountTokensOptions;

    const openaiNative = {
      provider: "openai",
      model: "gpt-4o",
      content: [{ role: "user", content: "Hello" }],
    } satisfies CountTokensOptions;

    const anthropicNative = {
      provider: "anthropic",
      model: "claude-sonnet-4-6",
      content: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
    } satisfies CountTokensOptions;

    const googleNative = {
      provider: "google",
      model: "gemini-2.0-flash",
      content: [{ role: "user", parts: [{ text: "Hello" }] }],
    } satisfies CountTokensOptions;

    const aiSdkMessages = {
      provider: "openai",
      model: "gpt-4o",
      content: [{ role: "user", content: "Hello" }],
    } satisfies CountTokensOptions;

    const uiMessages = {
      provider: "openai",
      model: "gpt-4o",
      content: [{ id: "1", role: "user", parts: [{ type: "text", text: "Hello" }] }],
    } satisfies CountTokensOptions;

    expect(typeof textOpenAI.content).toBe("string");
    expect(Array.isArray(openaiNative.content)).toBe(true);
    expect(Array.isArray(anthropicNative.content)).toBe(true);
    expect(Array.isArray(googleNative.content)).toBe(true);
    expect(Array.isArray(aiSdkMessages.content)).toBe(true);
    expect(Array.isArray(uiMessages.content)).toBe(true);
  });
});
