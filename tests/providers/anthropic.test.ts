import { afterEach, describe, expect, it, vi } from "vitest";
import { countTokens } from "../../src/count-tokens.js";

describe("anthropic adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses count_tokens response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ input_tokens: 14 }),
      }),
    );

    const result = await countTokens({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      inputMode: "text",
      input: "Hello",
      mode: "endpoint",
      apiKey: "test-key",
    });

    expect(result.tokens).toBe(14);
    expect(result.estimated).toBe(false);
  });
});
