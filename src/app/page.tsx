"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { StudioChrome } from "@/components/studio-chrome";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
};

type ModelName = "llama-3.1-8b-instant" | "llama-3.3-70b-versatile" | "mixtral-8x7b-32768";

type ModelConfig = {
  model: ModelName;
  temperature: number;
  maxTokens: number;
  topP: number;
};

type StoredSession = {
  id: string;
  title: string;
  model: string;
  date: string;
  tokens: number;
  status: "COMPLETED" | "FAILED";
};

const SESSION_STORAGE_KEY = "chat_sessions_v1";
const SESSION_MESSAGES_STORAGE_KEY = "chat_session_messages_v1";
const ACTIVE_SESSION_STORAGE_KEY = "chat_active_session_id_v1";
const METRICS_CONFIG_STORAGE_KEY = "metrics_model_config_v1";
const FORCE_NEW_CHAT_STORAGE_KEY = "chat_force_new";

const DEFAULT_MODEL_CONFIG: ModelConfig = {
  model: "llama-3.1-8b-instant",
  temperature: 0.6,
  maxTokens: 1024,
  topP: 0.9,
};

const MODEL_LABELS: Record<ModelName, string> = {
  "llama-3.1-8b-instant": "Llama 3.1 8B Instant",
  "llama-3.3-70b-versatile": "Llama 3.3 70B Versatile",
  "mixtral-8x7b-32768": "Mixtral 8x7B",
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

const starter: ChatMessage = {
  id: "assistant-0",
  role: "assistant",
  content:
    "Hola, soy AI Studio. Contame qué querés construir y te ayudo con una respuesta clara y accionable.",
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([starter]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatEnabled, setChatEnabled] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(DEFAULT_MODEL_CONFIG);
  const messagesRef = useRef<HTMLElement | null>(null);

  function startNewChat() {
    setMessages([starter]);
    setInput("");
    setError("");
    setLoading(false);
    setAndPersistActiveSessionId(null);
    window.history.replaceState({}, "", "/");
  }

  function setAndPersistActiveSessionId(sessionId: string | null) {
    setActiveSessionId(sessionId);

    if (!sessionId) {
      localStorage.removeItem(ACTIVE_SESSION_STORAGE_KEY);
      return;
    }

    localStorage.setItem(ACTIVE_SESSION_STORAGE_KEY, sessionId);
  }

  function readActiveSessionId() {
    const stored = localStorage.getItem(ACTIVE_SESSION_STORAGE_KEY);
    return stored?.trim() ? stored : null;
  }

  function readSessionMessagesMap() {
    const raw = localStorage.getItem(SESSION_MESSAGES_STORAGE_KEY);
    if (!raw) return {} as Record<string, ChatMessage[]>;

    try {
      const parsed = JSON.parse(raw) as Record<string, ChatMessage[]>;
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function persistSessionMessages(sessionId: string, sessionMessages: ChatMessage[]) {
    const current = readSessionMessagesMap();
    const next = {
      ...current,
      [sessionId]: sessionMessages,
    };

    localStorage.setItem(SESSION_MESSAGES_STORAGE_KEY, JSON.stringify(next));
  }

  function getSessionMessages(sessionId: string) {
    const current = readSessionMessagesMap();
    const stored = current[sessionId];
    if (!Array.isArray(stored)) return null;

    const valid = stored.filter(
      (msg) =>
        msg &&
        (msg.role === "user" || msg.role === "assistant") &&
        typeof msg.content === "string" &&
        typeof msg.id === "string",
    );

    return valid.length > 0 ? valid : null;
  }

  function buildSessionTitle(text: string) {
    const cleanText = text.replace(/\s+/g, " ").trim();
    if (!cleanText) return "Conversación sin título";
    return cleanText.slice(0, 80);
  }

  function readSessions() {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return [] as StoredSession[];

    try {
      const parsed = JSON.parse(raw) as StoredSession[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function persistSession(entry: StoredSession) {
    const current = readSessions();
    const next = [entry, ...current.filter((session) => session.id !== entry.id)].slice(0, 100);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
  }

  function upsertActiveSession(params: {
    sessionId: string;
    firstMessage: string;
    tokensDelta: number;
    status: StoredSession["status"];
    model: string;
  }) {
    const nowIso = new Date().toISOString();
    const current = readSessions();
    const found = current.find((session) => session.id === params.sessionId);

    if (!found) {
      persistSession({
        id: params.sessionId,
        title: buildSessionTitle(params.firstMessage),
        model: params.model,
        date: nowIso,
        tokens: Math.max(1, params.tokensDelta),
        status: params.status,
      });
      return;
    }

    persistSession({
      ...found,
      model: params.model,
      date: nowIso,
      tokens: Math.max(1, found.tokens + params.tokensDelta),
      status: params.status,
    });
  }

  const promptTokens = useMemo(
    () =>
      Math.max(
        1,
        Math.round(
          messages
            .filter((m) => m.role === "user")
            .map((m) => m.content)
            .join(" ")
            .length / 4,
        ),
      ),
    [messages],
  );

  const completionTokens = useMemo(
    () =>
      Math.max(
        1,
        Math.round(
          messages
            .filter((m) => m.role === "assistant")
            .map((m) => m.content)
            .join(" ")
            .length / 4,
        ),
      ),
    [messages],
  );

  const totalTokens = promptTokens + completionTokens;
  const tokenLimitReached = totalTokens >= modelConfig.maxTokens;

  useEffect(() => {
    const el = messagesRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    async function loadStatus() {
      try {
        const response = await fetch("/api/chat", { method: "GET" });
        if (!response.ok) return;

        const data = (await response.json()) as { enabled?: boolean };
        const enabled = data.enabled !== false;
        setChatEnabled(enabled);

        if (!enabled) {
          alert("El chat está deshabilitado en este momento.");
        }
      } catch {
        // Si falla la comprobacion de estado, no bloqueamos el chat.
      }
    }

    void loadStatus();
  }, []);

  useEffect(() => {
    function loadModelConfigFromStorage() {
      const raw = localStorage.getItem(METRICS_CONFIG_STORAGE_KEY);
      if (!raw) {
        setModelConfig(DEFAULT_MODEL_CONFIG);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as unknown;
        if (!isValidModelConfig(parsed)) {
          setModelConfig(DEFAULT_MODEL_CONFIG);
          return;
        }

        setModelConfig(normalizeModelConfig(parsed));
      } catch {
        setModelConfig(DEFAULT_MODEL_CONFIG);
      }
    }

    loadModelConfigFromStorage();

    function onStorage(event: StorageEvent) {
      if (event.key === METRICS_CONFIG_STORAGE_KEY) {
        loadModelConfigFromStorage();
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    function handleNewChatRequest() {
      startNewChat();
    }

    window.addEventListener("app:new-chat-request", handleNewChatRequest);
    return () => window.removeEventListener("app:new-chat-request", handleNewChatRequest);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldStartNew = params.get("new") === "1" || localStorage.getItem(FORCE_NEW_CHAT_STORAGE_KEY) === "1";

    if (shouldStartNew) {
      localStorage.removeItem(FORCE_NEW_CHAT_STORAGE_KEY);
      startNewChat();
      return;
    }

    const requestedSessionId = params.get("sessionId");
    const persistedSessionId = readActiveSessionId();

    let sessionToLoad = requestedSessionId || persistedSessionId;

    if (!sessionToLoad) {
      const mostRecentSessionId = readSessions()[0]?.id;
      if (mostRecentSessionId) {
        sessionToLoad = mostRecentSessionId;
      }
    }

    if (!sessionToLoad) return;

    const storedMessages = getSessionMessages(sessionToLoad);
    if (!storedMessages) {
      if (requestedSessionId) {
        alert("No se encontró el contenido de la sesión seleccionada.");
      }
      return;
    }

    setMessages(storedMessages);
    setAndPersistActiveSessionId(sessionToLoad);
    setError("");
  }, []);

  async function onSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const text = input.trim();
    if (!text || loading) return;

    if (!chatEnabled) {
      alert("El chat está deshabilitado en este momento.");
      return;
    }

    if (tokenLimitReached) {
      const limitMessage = `Se alcanzó el máximo de tokens (${modelConfig.maxTokens}) configurado para esta sesión.`;
      setError(limitMessage);
      alert(limitMessage);
      return;
    }

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: text,
    };

    const sessionId = activeSessionId ?? `S-${Date.now()}`;
    if (!activeSessionId) {
      setAndPersistActiveSessionId(sessionId);
    }

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    persistSessionMessages(sessionId, nextMessages);
    setInput("");
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, modelConfig }),
      });

      const data = (await response.json()) as { reply?: string; error?: string };

      if (!response.ok) {
        const apiError = data.error?.trim() || "No se pudo obtener respuesta del modelo";

        if (response.status === 503) {
          setChatEnabled(false);
          alert(apiError);
        }

        upsertActiveSession({
          sessionId,
          firstMessage: text,
          tokensDelta: Math.max(1, Math.round(text.length / 4)),
          status: "FAILED",
          model: MODEL_LABELS[modelConfig.model],
        });

        throw new Error(apiError);
      }

      const replyText = data.reply?.trim() || "";
      if (!replyText) {
        throw new Error("Respuesta vacía del modelo");
      }

      const updatedMessages = [
        ...nextMessages,
        {
          id: crypto.randomUUID(),
          role: "assistant" as const,
          content: replyText,
        },
      ];

      setMessages(updatedMessages);
      persistSessionMessages(sessionId, updatedMessages);

      upsertActiveSession({
        sessionId,
        firstMessage: text,
        tokensDelta: Math.max(1, Math.round((text.length + replyText.length) / 4)),
        status: "COMPLETED",
        model: MODEL_LABELS[modelConfig.model],
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <StudioChrome activeTab="chat">
      <section className="grid grid-cols-1 gap-3 border-b border-line px-5 py-5 dark:border-slate-800 sm:grid-cols-3">
        <article className="rounded-ui border border-line bg-card p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">Tokens de entrada</p>
          <p className="mt-1 text-4xl font-bold dark:text-white">{promptTokens.toLocaleString()}</p>
        </article>
        <article className="rounded-ui border border-line bg-card p-4 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm text-slate-600 dark:text-slate-400">Tokens de salida</p>
          <p className="mt-1 text-4xl font-bold dark:text-white">{completionTokens.toLocaleString()}</p>
        </article>
        <article className="rounded-ui border border-accent bg-accent/10 p-4 dark:bg-accent/20">
          <p className="text-sm text-slate-600 dark:text-slate-300">Tokens totales</p>
          <p className="mt-1 text-4xl font-bold text-accent">{totalTokens.toLocaleString()}</p>
          <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
            Límite: {modelConfig.maxTokens.toLocaleString()}
          </p>
        </article>
      </section>

      <section
        ref={messagesRef}
        className="h-[calc(100vh-22rem)] min-h-[18rem] space-y-4 overflow-y-auto px-4 py-5 pb-40"
      >
        {messages.map((message, index) => (
          <article
            key={message.id}
            className={`animate-rise rounded-ui border p-4 shadow-panel ${
              message.role === "assistant"
                ? "border-line bg-card dark:border-slate-700 dark:bg-slate-900"
                : "ml-auto max-w-[92%] border-accent bg-accent text-white"
            }`}
            style={{ animationDelay: `${index * 40}ms` }}
          >
            <div className="mb-3 flex items-center gap-3 border-b border-line/80 pb-3">
              <span
                className={`rounded-full px-3 py-1 text-sm font-semibold ${
                  message.role === "assistant" ? "bg-accentSoft text-accent" : "bg-white/20 text-white"
                }`}
              >
                {message.role === "assistant" ? MODEL_LABELS[modelConfig.model] : "Tu"}
              </span>
              {message.role === "assistant" ? (
                <span className="rounded-lg bg-ok px-2 py-1 text-xs font-bold text-emerald-900">VERIFICADO</span>
              ) : null}
            </div>
            <p className="whitespace-pre-wrap text-lg leading-8 dark:text-white">{message.content}</p>
          </article>
        ))}

        {loading ? (
          <p className="px-2 text-sm font-medium text-slate-600 dark:text-slate-400">Generando respuesta...</p>
        ) : null}

        {error ? (
          <p className="rounded-ui border border-red-300 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>
        ) : null}
      </section>

      <div className="fixed bottom-16 left-0 right-0 z-20 mx-auto w-full max-w-3xl px-4 sm:bottom-20">
        {tokenLimitReached ? (
          <p className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-800">
            Chat bloqueado: alcanzaste el máximo de tokens configurado ({modelConfig.maxTokens}).
          </p>
        ) : null}
        <form
          onSubmit={onSend}
          className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 shadow-panel dark:border-slate-700 dark:bg-slate-900"
        >
          <input
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Escribe un mensaje..."
            className="h-12 flex-1 rounded-xl border border-line bg-white px-4 text-lg outline-none transition focus:border-accent dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            type="submit"
            disabled={loading || !chatEnabled || tokenLimitReached}
            className="h-12 rounded-xl bg-accent px-5 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Enviar
          </button>
        </form>
      </div>

    </StudioChrome>
  );
}
