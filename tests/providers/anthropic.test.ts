import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { countTokens } from "../../src/count-tokens.js";
import { MissingApiKeyError, RateLimitError } from "../../src/errors/index.js";

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
      text: "Hello",
      mode: "endpoint",
      apiKey: "test-key",
    });

    expect(result.tokens).toBe(14);
    expect(result.estimated).toBe(false);
  });

  it("maps 401 to MissingApiKeyError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        statusText: "Unauthorized",
        text: async () => "",
      }),
    );

    await expect(
      countTokens({
        provider: "anthropic",
        model: "claude-sonnet-4",
        text: "Hi",
        mode: "endpoint",
        apiKey: "bad",
      }),
    ).rejects.toThrow(MissingApiKeyError);
  });

  it("maps 429 to RateLimitError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        text: async () => "",
      }),
    );

    await expect(
      countTokens({
        provider: "anthropic",
        model: "claude-sonnet-4",
        text: "Hi",
        mode: "endpoint",
        apiKey: "key",
      }),
    ).rejects.toThrow(RateLimitError);
  });

  it("hoists system messages to top-level system field", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ input_tokens: 14 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await countTokens({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      messages: [
        { role: "system", content: "Be helpful." },
        { role: "user", content: "Hello" },
      ],
      mode: "endpoint",
      apiKey: "test-key",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.system).toBe("Be helpful.");
    expect(body.messages).toEqual([
      { role: "user", content: [{ type: "text", text: "Hello" }] },
    ]);
  });

  it("includes tool blocks by default", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ input_tokens: 14 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await countTokens({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      messages: [
        {
          role: "assistant",
          parts: [
            { type: "text", text: "Calling tool." },
            {
              type: "tool_call",
              id: "toolu_1",
              name: "get_weather",
              arguments: "{\"city\":\"Paris\"}",
            },
          ],
        },
        {
          role: "user",
          parts: [
            {
              type: "tool_output",
              callId: "toolu_1",
              output: "{\"temp\":20}",
            },
          ],
        },
      ],
      mode: "endpoint",
      apiKey: "test-key",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.messages).toEqual([
      {
        role: "assistant",
        content: [
          { type: "text", text: "Calling tool." },
          {
            type: "tool_use",
            id: "toolu_1",
            name: "get_weather",
            input: { city: "Paris" },
          },
        ],
      },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: "toolu_1",
            content: "{\"temp\":20}",
          },
        ],
      },
    ]);
  });

  it("skips tool blocks when countAssistantTools is false", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ input_tokens: 14 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await countTokens({
      provider: "anthropic",
      model: "claude-sonnet-4-20250514",
      messages: [
        {
          role: "assistant",
          parts: [
            { type: "text", text: "Calling tool." },
            {
              type: "tool_call",
              id: "toolu_1",
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
    expect(body.messages).toEqual([
      {
        role: "assistant",
        content: [{ type: "text", text: "Calling tool." }],
      },
    ]);
  });
});
