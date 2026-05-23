import dotenv from "dotenv";
import {
  calculatePrice,
  countHeuristic,
  countTokens,
  estimateTokens,
} from "../src/index.js";

dotenv.config();

const MODEL = "gpt-5.5";

const BASIC_INPUT = [
  { role: "assistant" as const, content: "How can I help you today?" },
  { role: "user" as const, content: "Tiktoken is a library for counting tokens." },
];

const OPENAI_FULL_INPUT = [
  { role: "assistant" as const, content: "I'll check the weather for Paris." },
  {
    type: "function_call" as const,
    call_id: "call_weather_1",
    name: "get_weather",
    arguments: "{\"city\":\"Paris\",\"units\":\"celsius\"}",
  },
  {
    type: "function_call_output" as const,
    call_id: "call_weather_1",
    output: "{\"temp\":20,\"condition\":\"clear\"}",
  },
  { role: "assistant" as const, content: "It's 20C and clear in Paris." },
  { role: "user" as const, content: "Great, and what about Madrid?" },
];

function log(label: string, data: unknown) {
  console.log(`\n--- ${label} ---`);
  console.log(JSON.stringify(data, null, 2));
}

async function main() {
  const hasApiKey = Boolean(process.env.OPENAI_API_KEY?.trim());

  if (!hasApiKey) {
    console.warn("OPENAI_API_KEY missing: skipping endpoint examples");
  }

  if (hasApiKey) {
    log(
      "countTokens (endpoint / basic)",
      await countTokens({
        provider: "openai",
        model: MODEL,
        input: BASIC_INPUT,
        mode: "endpoint",
      }),
    );
  }

  log(
    "countTokens (auto / basic)",
    await countTokens({
      provider: "openai",
      model: MODEL,
      input: BASIC_INPUT,
      mode: "auto",
    }),
  );

  log(
    "countTokens (local / tiktoken / basic)",
    await countTokens({
      provider: "openai",
      model: MODEL,
      input: BASIC_INPUT,
      mode: "local",
    }),
  );

  log(
    "estimateTokens (basic)",
    await estimateTokens({
      provider: "openai",
      model: MODEL,
      input: BASIC_INPUT,
    }),
  );

  log(
    "countTokens (local / full input / tools included)",
    await countTokens({
      provider: "openai",
      model: MODEL,
      input: OPENAI_FULL_INPUT,
      mode: "local",
      countAssistantTools: true,
    }),
  );

  log(
    "countTokens (local / full input / tools excluded)",
    await countTokens({
      provider: "openai",
      model: MODEL,
      input: OPENAI_FULL_INPUT,
      mode: "local",
      countAssistantTools: false,
    }),
  );

  if (hasApiKey) {
    const endpointFullInput = await countTokens({
      provider: "openai",
      model: MODEL,
      input: OPENAI_FULL_INPUT,
      mode: "endpoint",
      countAssistantTools: true,
    });

    log("countTokens (endpoint / full input / tools included)", endpointFullInput);
    log(
      "calculatePrice (from endpoint full input)",
      calculatePrice({
        provider: "openai",
        model: MODEL,
        tokens: endpointFullInput.tokens,
      }),
    );
  }

  log("countHeuristic (basic)", {
    tokens: countHeuristic({
      text: "How can I help you today?\nTiktoken is a library for counting tokens.",
    }),
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
