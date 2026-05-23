import dotenv from "dotenv";
import {
  calculatePrice,
  countHeuristic,
  countTokens,
  estimateTokens,
  type Message,
} from "../src/index.js";

dotenv.config();

const MODEL = "gpt-5.5";
const BASIC_MESSAGES: Message[] = [
  { role: "assistant", content: "How can I help you today?" },
  { role: "user", content: "Tiktoken is a library for counting tokens." },
];

const OPENAI_FULL_PARTS_MESSAGES: Message[] = [
  {
    role: "assistant",
    parts: [
      { type: "text", text: "I'll check the weather for Paris." },
      {
        type: "tool_call",
        id: "call_weather_1",
        name: "get_weather",
        arguments: "{\"city\":\"Paris\",\"units\":\"celsius\"}",
      },
    ],
  },
  {
    role: "assistant",
    parts: [
      {
        type: "tool_output",
        callId: "call_weather_1",
        output: "{\"temp\":20,\"condition\":\"clear\"}",
      },
      { type: "text", text: "It's 20C and clear in Paris." },
    ],
  },
  {
    role: "user",
    parts: [{ type: "text", text: "Great, and what about Madrid?" }],
  },
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
        messages: BASIC_MESSAGES,
        mode: "endpoint",
      }),
    );
  }

  log(
    "countTokens (auto / basic)",
    await countTokens({
      provider: "openai",
      model: MODEL,
      messages: BASIC_MESSAGES,
      mode: "auto",
    }),
  );

  log(
    "countTokens (local / tiktoken / basic)",
    await countTokens({
      provider: "openai",
      model: MODEL,
      messages: BASIC_MESSAGES,
      mode: "local",
    }),
  );

  log(
    "estimateTokens (basic)",
    await estimateTokens({
      provider: "openai",
      model: MODEL,
      messages: BASIC_MESSAGES,
    }),
  );

  log(
    "countTokens (local / full parts / tools included)",
    await countTokens({
      provider: "openai",
      model: MODEL,
      messages: OPENAI_FULL_PARTS_MESSAGES,
      mode: "local",
      countAssistantTools: true,
    }),
  );

  log(
    "countTokens (local / full parts / tools excluded)",
    await countTokens({
      provider: "openai",
      model: MODEL,
      messages: OPENAI_FULL_PARTS_MESSAGES,
      mode: "local",
      countAssistantTools: false,
    }),
  );

  if (hasApiKey) {
    const endpointFullParts = await countTokens({
      provider: "openai",
      model: MODEL,
      messages: OPENAI_FULL_PARTS_MESSAGES,
      mode: "endpoint",
      countAssistantTools: true,
    });

    log("countTokens (endpoint / full parts / tools included)", endpointFullParts);
    log(
      "calculatePrice (from endpoint full parts)",
      calculatePrice({
        provider: "openai",
        model: MODEL,
        tokens: endpointFullParts.tokens,
      }),
    );
  }

  log("countHeuristic (basic)", { tokens: countHeuristic({ messages: BASIC_MESSAGES }) });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
