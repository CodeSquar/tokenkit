import { afterEach, describe, expect, it, vi } from "vitest";
import { googleAdapter } from "../../src/providers/google/adapter.js";
import { countTokens } from "../../src/count-tokens.js";

describe("google adapter", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("delegates local count to heuristic strategy", () => {
    const tokens = googleAdapter.countViaLocal({
      provider: "google",
      model: "gemini-2.0-flash",
      payload: [{ role: "user", parts: [{ text: "Hello" }] }],
      countAssistantTools: true,
    });
    expect(tokens).toBeGreaterThan(0);
  });

  it("parses countTokens API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ totalTokens: 10 }),
      }),
    );

    const result = await countTokens({
      provider: "google",
      model: "gemini-2.0-flash",
      inputMode: "text",
      input: "Hello",
      mode: "endpoint",
      apiKey: "gemini-key",
    });

    expect(result.tokens).toBe(10);
    expect(result.method).toBe("provider_endpoint");
  });

  it("uses generateContentRequest when systemInstruction is present", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ totalTokens: 10 }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await countTokens({
      provider: "google",
      model: "gemini-2.0-flash",
      inputMode: "provider",
      contents: [{ role: "user", parts: [{ text: "Hello" }] }],
      systemInstruction: { role: "system", parts: [{ text: "Be concise" }] },
      mode: "endpoint",
      apiKey: "gemini-key",
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.generateContentRequest).toBeDefined();
    expect(body.generateContentRequest.systemInstruction).toEqual({
      role: "system",
      parts: [{ text: "Be concise" }],
    });
    expect(body.generateContentRequest.model).toBe("models/gemini-2.0-flash");
    expect(body.contents).toBeUndefined();
  });
});
