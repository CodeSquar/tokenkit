import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { countTokens } from "../../src/count-tokens.js";

describe("openai adapter", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ input_tokens: 42 }),
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls input_tokens endpoint in endpoint mode", async () => {
    const result = await countTokens({
      provider: "openai",
      model: "gpt-4o",
      inputMode: "text",
      input: "Hello",
      mode: "endpoint",
      apiKey: "test-key",
    });

    expect(result.tokens).toBe(42);
    expect(result.method).toBe("provider_endpoint");
  });

  it("skips tool items when countAssistantTools is false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ input_tokens: 42 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await countTokens({
      provider: "openai",
      model: "gpt-4o",
      input: [
        { role: "assistant", content: "Let me check." },
        {
          type: "function_call",
          call_id: "call_1",
          name: "get_weather",
          arguments: "{\"city\":\"Paris\"}",
        },
      ],
      mode: "endpoint",
      apiKey: "test-key",
      countAssistantTools: false,
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.input).toEqual([{ role: "assistant", content: "Let me check." }]);
  });
});
