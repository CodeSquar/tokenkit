import { describe, expect, it } from "vitest";
import { countTokens } from "../../src/count-tokens.js";
import {
  hasEnvKey,
  INTEGRATION_MODELS,
  SAMPLE_PROMPT,
} from "./helpers.js";

const TOOL_MESSAGES = {
  openai: [
    {
      role: "assistant" as const,
      parts: [
        { type: "text" as const, text: "I'll call a tool." },
        {
          type: "tool_call" as const,
          id: "call_1",
          name: "get_weather",
          arguments: "{\"city\":\"Paris\",\"units\":\"celsius\"}",
        },
        {
          type: "tool_output" as const,
          callId: "call_1",
          output: "{\"temp\":20,\"condition\":\"clear\"}",
        },
      ],
    },
    { role: "user" as const, content: "Thanks." },
  ],
  anthropic: [
    {
      role: "assistant" as const,
      parts: [
        { type: "text" as const, text: "I'll call a tool." },
        {
          type: "tool_call" as const,
          id: "toolu_1",
          name: "get_weather",
          arguments: "{\"city\":\"Paris\",\"units\":\"celsius\"}",
        },
      ],
    },
    {
      role: "user" as const,
      parts: [
        {
          type: "tool_output" as const,
          callId: "toolu_1",
          output: "{\"temp\":20,\"condition\":\"clear\"}",
        },
      ],
    },
  ],
  google: [
    {
      role: "assistant" as const,
      parts: [
        { type: "text" as const, text: "I'll call a tool." },
        {
          type: "tool_call" as const,
          id: "call_1",
          name: "get_weather",
          arguments: "{\"city\":\"Paris\",\"units\":\"celsius\"}",
        },
      ],
    },
    {
      role: "user" as const,
      parts: [
        {
          type: "tool_output" as const,
          callId: "call_1",
          output: "{\"temp\":20,\"condition\":\"clear\"}",
        },
      ],
    },
  ],
};

describe("integration / OpenAI", () => {
  const canRun = hasEnvKey("OPENAI_API_KEY");

  it.skipIf(!canRun)(
    `counts tokens via endpoint for ${INTEGRATION_MODELS.openai}`,
    async () => {
      const result = await countTokens({
        provider: "openai",
        model: INTEGRATION_MODELS.openai,
        text: SAMPLE_PROMPT,
        mode: "endpoint",
      });

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.estimated).toBe(false);
      expect(result.method).toBe("provider_endpoint");
      expect(result.provider).toBe("openai");
      expect(result.model).toBe(INTEGRATION_MODELS.openai);
    },
  );

  it.skipIf(!canRun)("counts assistant tool parts when enabled (endpoint)", async () => {
    const withTools = await countTokens({
      provider: "openai",
      model: INTEGRATION_MODELS.openai,
      messages: TOOL_MESSAGES.openai,
      mode: "endpoint",
      countAssistantTools: true,
    });

    const withoutTools = await countTokens({
      provider: "openai",
      model: INTEGRATION_MODELS.openai,
      messages: TOOL_MESSAGES.openai,
      mode: "endpoint",
      countAssistantTools: false,
    });

    expect(withTools.tokens).toBeGreaterThan(withoutTools.tokens);
  });
});

describe("integration / Anthropic", () => {
  const canRun = hasEnvKey("ANTHROPIC_API_KEY");

  it.skipIf(!canRun)(
    `counts tokens via endpoint for ${INTEGRATION_MODELS.anthropic}`,
    async () => {
      const result = await countTokens({
        provider: "anthropic",
        model: INTEGRATION_MODELS.anthropic,
        messages: [{ role: "user", content: SAMPLE_PROMPT }],
        mode: "endpoint",
      });

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.estimated).toBe(false);
      expect(result.method).toBe("provider_endpoint");
      expect(result.provider).toBe("anthropic");
      expect(result.model).toBe(INTEGRATION_MODELS.anthropic);
    },
  );

  it.skipIf(!canRun)("counts assistant tool parts when enabled (endpoint)", async () => {
    const withTools = await countTokens({
      provider: "anthropic",
      model: INTEGRATION_MODELS.anthropic,
      messages: TOOL_MESSAGES.anthropic,
      mode: "endpoint",
      countAssistantTools: true,
    });

    const withoutTools = await countTokens({
      provider: "anthropic",
      model: INTEGRATION_MODELS.anthropic,
      messages: TOOL_MESSAGES.anthropic,
      mode: "endpoint",
      countAssistantTools: false,
    });

    expect(withTools.tokens).toBeGreaterThan(withoutTools.tokens);
  });
});

describe("integration / Google Gemini", () => {
  const canRun = hasEnvKey("GEMINI_API_KEY", "GOOGLE_API_KEY");

  it.skipIf(!canRun)(
    `counts tokens via endpoint for ${INTEGRATION_MODELS.google}`,
    async () => {
      const result = await countTokens({
        provider: "google",
        model: INTEGRATION_MODELS.google,
        text: SAMPLE_PROMPT,
        mode: "endpoint",
      });

      expect(result.tokens).toBeGreaterThan(0);
      expect(result.estimated).toBe(false);
      expect(result.method).toBe("provider_endpoint");
      expect(result.provider).toBe("google");
      expect(result.model).toBe(INTEGRATION_MODELS.google);
    },
  );

  it.skipIf(!canRun)("counts assistant tool parts when enabled (endpoint)", async () => {
    const withTools = await countTokens({
      provider: "google",
      model: INTEGRATION_MODELS.google,
      messages: TOOL_MESSAGES.google,
      mode: "endpoint",
      countAssistantTools: true,
    });

    const withoutTools = await countTokens({
      provider: "google",
      model: INTEGRATION_MODELS.google,
      messages: TOOL_MESSAGES.google,
      mode: "endpoint",
      countAssistantTools: false,
    });

    expect(withTools.tokens).toBeGreaterThan(withoutTools.tokens);
  });
});

describe("integration / all providers", () => {
  const canRunAll =
    hasEnvKey("OPENAI_API_KEY") &&
    hasEnvKey("ANTHROPIC_API_KEY") &&
    hasEnvKey("GEMINI_API_KEY", "GOOGLE_API_KEY");

  it.skipIf(!canRunAll)(
    "returns consistent shape across frontier models",
    async () => {
      const cases = [
        {
          provider: "openai" as const,
          model: INTEGRATION_MODELS.openai,
        },
        {
          provider: "anthropic" as const,
          model: INTEGRATION_MODELS.anthropic,
        },
        {
          provider: "google" as const,
          model: INTEGRATION_MODELS.google,
        },
      ];

      for (const { provider, model } of cases) {
        const result = await countTokens({
          provider,
          model,
          text: SAMPLE_PROMPT,
          mode: "endpoint",
        });

        expect(result).toMatchObject({
          provider,
          model,
          estimated: false,
          method: "provider_endpoint",
        });
        expect(result.tokens).toBeGreaterThan(0);
        expect(
          result.price === null ||
            (typeof result.price.usd === "number" && result.price.usd >= 0),
        ).toBe(true);
      }
    },
  );
});
