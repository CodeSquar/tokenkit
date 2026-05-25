import dotenv from "dotenv";
import type { ModelMessage } from "ai";
import { countTokens, type Provider } from "../src/index.js";

dotenv.config();

const MODELS: Record<Provider, string> = {
  openai: "gpt-5.5",
  anthropic: "claude-opus-4-7",
  google: "gemini-3-flash-preview",
};

const AI_SDK_MODELS: Record<Provider, string> = {
  openai: "gpt-5.5",
  anthropic: "claude-opus-4-7",
  google: "gemini-3-flash-preview",
};

type ContentKind = "native" | "messages";

type Row = {
  provider: Provider;
  mode: "endpoint" | "local";
  contentKind: ContentKind;
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
  return Boolean(process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim());
}

function fmt(value: unknown): string {
  if (value === undefined || value === null) return "-";
  return String(value);
}

function printSummary(rows: Row[]) {
  console.log(
    "\nprovider   mode      content    tools  ok   tokens   estimated  method              usd        error",
  );
  console.log(
    "---------  --------  ---------  -----  ---  -------  ---------  ------------------  ---------  ------------------------------",
  );
  for (const row of rows) {
    const line = [
      row.provider.padEnd(9),
      row.mode.padEnd(8),
      row.contentKind.padEnd(9),
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

function getNativeContent(provider: Provider) {
  if (provider === "openai") {
    return [
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
    ];
  }

  if (provider === "anthropic") {
    return [
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
    ];
  }

  return [
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
  ];
}

function getAISdkMessages(): ModelMessage[] {
  return [
    { role: "system", content: "You are concise." },
    { role: "assistant", content: "I'll call a tool to fetch weather." },
    {
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "call_1",
          toolName: "get_weather",
          input: { city: "Paris", units: "celsius" },
        },
      ],
    },
    {
      role: "tool",
      content: [
        {
          type: "tool-result",
          toolCallId: "call_1",
          toolName: "get_weather",
          output: { type: "json", value: { temp: 20, condition: "clear" } },
        },
      ],
    },
    { role: "user", content: [{ type: "text", text: "Thanks. And now Madrid?" }] },
  ];
}

async function runCase(
  provider: Provider,
  mode: "endpoint" | "local",
  contentKind: ContentKind,
  tools: "on" | "off",
): Promise<Row> {
  try {
    const content =
      contentKind === "native"
        ? getNativeContent(provider)
        : getAISdkMessages();

    const model =
      contentKind === "native" ? MODELS[provider] : AI_SDK_MODELS[provider];

    const result = await countTokens({
      provider,
      model,
      mode,
      countAssistantTools: tools === "on",
      content,
    });

    return {
      provider,
      mode,
      contentKind,
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
      contentKind,
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
    rows.push(await runCase(provider, "local", "native", "on"));
    rows.push(await runCase(provider, "local", "native", "off"));
    rows.push(await runCase(provider, "local", "messages", "on"));
    rows.push(await runCase(provider, "local", "messages", "off"));

    if (hasKey(provider)) {
      rows.push(await runCase(provider, "endpoint", "native", "on"));
      rows.push(await runCase(provider, "endpoint", "native", "off"));
      rows.push(await runCase(provider, "endpoint", "messages", "on"));
      rows.push(await runCase(provider, "endpoint", "messages", "off"));
    } else {
      for (const contentKind of ["native", "messages"] as const) {
        for (const tools of ["on", "off"] as const) {
          rows.push({
            provider,
            mode: "endpoint",
            contentKind,
            tools,
            ok: false,
            error: "missing API key",
          });
        }
      }
    }
  }

  printSummary(rows);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
