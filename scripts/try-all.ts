import dotenv from "dotenv";
import { countTokens, type Provider } from "../src/index.js";

dotenv.config();

const MODELS: Record<Provider, string> = {
  openai: "gpt-5.5",
  anthropic: "claude-opus-4-7",
  google: "gemini-3-flash-preview",
};

type Row = {
  provider: Provider;
  mode: "endpoint" | "local";
  tools: "on" | "off";
  ok: boolean;
  tokens?: number;
  estimated?: boolean;
  method?: string;
  usd?: number | null;
  error?: string;
};

function hasKey(provider: Provider): boolean {
  if (provider === "openai") return Boolean(process.env.OPENAI_API_KEY?.trim());
  if (provider === "anthropic") return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
  return Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim());
}

function fmt(value: unknown): string {
  if (value === undefined || value === null) return "-";
  return String(value);
}

function printSummary(rows: Row[]) {
  console.log(
    "\nprovider   mode      tools  ok   tokens   estimated  method              usd        error",
  );
  console.log(
    "---------  --------  -----  ---  -------  ---------  ------------------  ---------  ------------------------------",
  );
  for (const row of rows) {
    const line = [
      row.provider.padEnd(9),
      row.mode.padEnd(8),
      row.tools.padEnd(5),
      (row.ok ? "yes" : "no").padEnd(3),
      fmt(row.tokens).padEnd(7),
      fmt(row.estimated).padEnd(9),
      fmt(row.method).padEnd(18),
      fmt(row.usd).padEnd(9),
      (row.error ?? "").slice(0, 30),
    ].join("  ");
    console.log(line);
  }
}

function getInput(provider: Provider) {
  if (provider === "openai") {
    return {
      input: [
        { role: "assistant" as const, content: "I'll call a tool to fetch weather." },
        {
          type: "function_call" as const,
          call_id: "call_1",
          name: "get_weather",
          arguments: "{\"city\":\"Paris\",\"units\":\"celsius\"}",
        },
        {
          type: "function_call_output" as const,
          call_id: "call_1",
          output: "{\"temp\":20,\"condition\":\"clear\"}",
        },
        { role: "user" as const, content: "Thanks. And now Madrid?" },
      ],
    };
  }

  if (provider === "anthropic") {
    return {
      messages: [
        {
          role: "assistant" as const,
          content: [
            { type: "text" as const, text: "I'll call a tool to fetch weather." },
            {
              type: "tool_use" as const,
              id: "toolu_1",
              name: "get_weather",
              input: { city: "Paris", units: "celsius" },
            },
          ],
        },
        {
          role: "user" as const,
          content: [
            {
              type: "tool_result" as const,
              tool_use_id: "toolu_1",
              content: "{\"temp\":20,\"condition\":\"clear\"}",
            },
            { type: "text" as const, text: "Thanks. And now Madrid?" },
          ],
        },
      ],
    };
  }

  return {
    contents: [
      {
        role: "model" as const,
        parts: [
          { text: "I'll call a tool to fetch weather." },
          {
            functionCall: {
              id: "call_1",
              name: "get_weather",
              args: { city: "Paris", units: "celsius" },
            },
          },
        ],
      },
      {
        role: "user" as const,
        parts: [
          {
            functionResponse: {
              id: "call_1",
              name: "get_weather",
              response: { output: { temp: 20, condition: "clear" } },
            },
          },
          { text: "Thanks. And now Madrid?" },
        ],
      },
    ],
  };
}

async function runCase(
  provider: Provider,
  mode: "endpoint" | "local",
  tools: "on" | "off",
): Promise<Row> {
  try {
    const result = await countTokens({
      provider,
      model: MODELS[provider],
      mode,
      countAssistantTools: tools === "on",
      ...getInput(provider),
    } as never);

    return {
      provider,
      mode,
      tools,
      ok: true,
      tokens: result.tokens,
      estimated: result.estimated,
      method: result.method,
      usd: result.price?.usd ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      provider,
      mode,
      tools,
      ok: false,
      error: message,
    };
  }
}

async function main() {
  const rows: Row[] = [];
  const providers: Provider[] = ["openai", "anthropic", "google"];

  for (const provider of providers) {
    rows.push(await runCase(provider, "local", "on"));
    rows.push(await runCase(provider, "local", "off"));

    if (hasKey(provider)) {
      rows.push(await runCase(provider, "endpoint", "on"));
      rows.push(await runCase(provider, "endpoint", "off"));
    } else {
      rows.push({
        provider,
        mode: "endpoint",
        tools: "on",
        ok: false,
        error: "missing API key",
      });
      rows.push({
        provider,
        mode: "endpoint",
        tools: "off",
        ok: false,
        error: "missing API key",
      });
    }
  }

  printSummary(rows);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
