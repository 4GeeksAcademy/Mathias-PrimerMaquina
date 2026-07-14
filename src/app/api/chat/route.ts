import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type ModelName = "llama-3.1-8b-instant" | "llama-3.3-70b-versatile" | "mixtral-8x7b-32768";

type ModelConfig = {
  model: ModelName;
  temperature: number;
  maxTokens: number;
  topP: number;
};

type ChatPayload = {
  messages?: Message[];
  modelConfig?: ModelConfig;
};

function isValidModelConfig(value: unknown): value is ModelConfig {
  if (!value || typeof value !== "object") return false;

  const candidate = value as Partial<ModelConfig>;
  const validModel =
    candidate.model === "llama-3.1-8b-instant" ||
    candidate.model === "llama-3.3-70b-versatile" ||
    candidate.model === "mixtral-8x7b-32768";

  return (
    validModel &&
    typeof candidate.temperature === "number" &&
    typeof candidate.maxTokens === "number" &&
    typeof candidate.topP === "number"
  );
}

function normalizeModelConfig(config: ModelConfig): ModelConfig {
  return {
    model: config.model,
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    topP: config.topP,
  };
}

function isChatEnabled() {
  return process.env.CHAT_ENABLED !== "false";
}

function formatLocalTime(timeZone: string) {
  return new Intl.DateTimeFormat("es-CO", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

async function getLiveContextMarkdown() {
  const filePath = path.join(process.cwd(), "CHAT_LIVE_CONTEXT.md");
  const now = new Date();

  try {
    const raw = await readFile(filePath, "utf8");

    return raw
      .replaceAll("{{NOW_UTC}}", now.toISOString())
      .replaceAll("{{NOW_EPOCH_MS}}", String(now.getTime()))
      .replaceAll("{{TIME_SANTIAGO}}", formatLocalTime("America/Santiago"))
      .replaceAll("{{TIME_BOGOTA}}", formatLocalTime("America/Bogota"));
  } catch {
    return [
      "# Contexto vivo del chat",
      "No se pudo leer CHAT_LIVE_CONTEXT.md.",
      `now_utc: ${now.toISOString()}`,
      `hora_santiago: ${formatLocalTime("America/Santiago")}`,
      `hora_bogota: ${formatLocalTime("America/Bogota")}`,
    ].join("\n");
  }
}

export async function GET() {
  return NextResponse.json({ enabled: isChatEnabled() });
}

export async function POST(request: Request) {
  try {
    if (!isChatEnabled()) {
      return NextResponse.json(
        { error: "El chat está deshabilitado por configuración." },
        { status: 503 },
      );
    }

    const body = (await request.json()) as ChatPayload;
    const messages = body.messages ?? [];
    const modelConfig = isValidModelConfig(body.modelConfig) ? normalizeModelConfig(body.modelConfig) : null;
    const userMessages = messages.filter((m) => m.role === "user");
    const latestQuestion = userMessages.at(-1)?.content?.trim();
    const liveContext = await getLiveContextMarkdown();

    if (!latestQuestion) {
      return NextResponse.json({ error: "El mensaje está vacío" }, { status: 400 });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    const model = modelConfig?.model ?? process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";
    const temperature = modelConfig?.temperature ?? 0.6;
    const maxTokens = modelConfig?.maxTokens;
    const topP = modelConfig?.topP;

    if (!groqApiKey) {
      const demoReply = [
        "Modo demo activo (sin GROQ_API_KEY).",
        "Recibí tu mensaje y el flujo de chat funciona correctamente.",
        `Modelo activo: ${model}`,
        "",
        "Contexto vivo cargado desde CHAT_LIVE_CONTEXT.md:",
        liveContext,
        "",
        `Tu consulta: \"${latestQuestion}\"`,
        "Para respuestas de IA reales, agrega GROQ_API_KEY en tu .env.",
      ].join("\n\n");

      return NextResponse.json({ reply: demoReply });
    }

    const systemPrompt =
      [
        "Eres un asistente tecnico claro, breve y practico.",
        "Responde en español con pasos accionables.",
        "Si el usuario pregunta por hora/fecha, usa primero el contexto vivo y no inventes datos.",
        "Si un dato no existe en contexto, dilo explicitamente.",
        "",
        "CONTEXTO_VIVO_INICIAL:",
        liveContext,
      ].join("\n");

    const completion = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens: maxTokens,
        top_p: topP,
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!completion.ok) {
      const errorText = await completion.text();
      return NextResponse.json(
        { error: `Fallo la API de IA: ${errorText.slice(0, 500)}` },
        { status: 502 },
      );
    }

    const data = (await completion.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      return NextResponse.json({ error: "Respuesta vacía del modelo" }, { status: 502 });
    }

    return NextResponse.json({ reply });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
