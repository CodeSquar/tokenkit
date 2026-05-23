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
      text: "Hello",
      mode: "endpoint",
      apiKey: "test-key",
    });

    expect(result.tokens).toBe(42);
    expect(result.method).toBe("provider_endpoint");
    expect(result.estimated).toBe(false);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/responses/input_tokens",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      }),
    );
  });

  it("includes tool call and tool output by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ input_tokens: 42 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await countTokens({
      provider: "openai",
      model: "gpt-4o",
      messages: [
        {
          role: "assistant",
          parts: [
            { type: "text", text: "Let me check." },
            {
              type: "tool_call",
              id: "call_1",
              name: "get_weather",
              arguments: "{\"city\":\"Paris\"}",
            },
            {
              type: "tool_output",
              callId: "call_1",
              output: "{\"temp\":20}",
            },
          ],
        },
      ],
      mode: "endpoint",
      apiKey: "test-key",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.input).toEqual([
      { role: "assistant", content: "Let me check." },
      {
        type: "function_call",
        call_id: "call_1",
        name: "get_weather",
        arguments: "{\"city\":\"Paris\"}",
      },
      {
        type: "function_call_output",
        call_id: "call_1",
        output: "{\"temp\":20}",
      },
    ]);
  });

  it("skips tool call and tool output when countAssistantTools is false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ input_tokens: 42 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await countTokens({
      provider: "openai",
      model: "gpt-4o",
      messages: [
        {
          role: "assistant",
          parts: [
            { type: "text", text: "Let me check." },
            {
              type: "tool_call",
              id: "call_1",
              name: "get_weather",
              arguments: "{\"city\":\"Paris\"}",
            },
          ],
        },
      ],
      mode: "endpoint",
      apiKey: "test-key",
      countAssistantTools: false,
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.input).toEqual([{ role: "assistant", content: "Let me check." }]);
  });

  it("falls back to local in auto mode without api key", async () => {
    const result = await countTokens({
      provider: "openai",
      model: "gpt-4o",
      text: "Hello world",
      mode: "auto",
    });

    expect(result.tokens).toBeGreaterThan(0);
    expect(result.method).toBe("local_tiktoken");
    expect(result.estimated).toBe(true);
    expect(fetch).not.toHaveBeenCalled();
  });
});
