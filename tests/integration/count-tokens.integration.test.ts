import { describe, expect, it } from "vitest";
import { countTokens } from "../../src/count-tokens.js";
import { hasEnvKey, INTEGRATION_MODELS } from "./helpers.js";

describe("integration / OpenAI", () => {
  const canRun = hasEnvKey("OPENAI_API_KEY");

  it.skipIf(!canRun)("counts tokens via endpoint", async () => {
    const result = await countTokens({
      provider: "openai",
      model: INTEGRATION_MODELS.openai,
      input: "Hello",
      mode: "endpoint",
    });

    expect(result.tokens).toBeGreaterThan(0);
  });
});

describe("integration / Anthropic", () => {
  const canRun = hasEnvKey("ANTHROPIC_API_KEY");

  it.skipIf(!canRun)("counts tokens via endpoint", async () => {
    const result = await countTokens({
      provider: "anthropic",
      model: INTEGRATION_MODELS.anthropic,
      messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
      mode: "endpoint",
    });

    expect(result.tokens).toBeGreaterThan(0);
  });
});

describe("integration / Google", () => {
  const canRun = hasEnvKey("GEMINI_API_KEY", "GOOGLE_API_KEY");

  it.skipIf(!canRun)("counts tokens via endpoint", async () => {
    const result = await countTokens({
      provider: "google",
      model: INTEGRATION_MODELS.google,
      contents: [{ role: "user", parts: [{ text: "Hello" }] }],
      mode: "endpoint",
    });

    expect(result.tokens).toBeGreaterThan(0);
  });
});
