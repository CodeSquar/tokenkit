import { afterEach, describe, expect, it, vi } from "vitest";

describe("import safety", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.doUnmock("@anthropic-ai/tokenizer");
    vi.resetModules();
  });

  it("does not load the Anthropic tokenizer for OpenAI endpoint counting", async () => {
    vi.resetModules();
    const tokenizerFactory = vi.fn(() => {
      throw new Error("Anthropic tokenizer should not be loaded.");
    });
    vi.doMock("@anthropic-ai/tokenizer", tokenizerFactory);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ input_tokens: 12 }),
      }),
    );

    const { countTokens } = await import("../src/index.js");
    const result = await countTokens({
      provider: "openai",
      model: "gpt-4o",
      inputMode: "text",
      input: "Hello",
      mode: "endpoint",
      apiKey: "test-key",
    });

    expect(result.method).toBe("provider_endpoint");
    expect(result.tokens).toBe(12);
    expect(tokenizerFactory).not.toHaveBeenCalled();
  });

  it("wraps local tokenizer load failures in a typed error", async () => {
    vi.resetModules();
    vi.doMock("@anthropic-ai/tokenizer", () => {
      throw new Error("Missing tiktoken_bg.wasm");
    });

    const { LocalTokenizerUnavailableError, countTokens } = await import("../src/index.js");

    await expect(
      countTokens({
        provider: "anthropic",
        model: "claude-sonnet-4-20250514",
        inputMode: "text",
        input: "Hello",
        mode: "local",
      }),
    ).rejects.toThrow(LocalTokenizerUnavailableError);
  });
});
