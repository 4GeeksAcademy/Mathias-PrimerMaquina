"use client";

import { useEffect, useState } from "react";
import { StudioChrome } from "@/components/studio-chrome";

type StoredSession = {
  id: string;
  title: string;
  model: string;
  date: string;
  tokens: number;
  status: "COMPLETED" | "FAILED";
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type DeleteWindow = "1h" | "24h" | "7d" | "Todo";

const SESSION_STORAGE_KEY = "chat_sessions_v1";
const SESSION_MESSAGES_STORAGE_KEY = "chat_session_messages_v1";

function formatSessionDate(isoDate: string) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export default function HistoryPage() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [deleteWindow, setDeleteWindow] = useState<DeleteWindow>("24h");
  const [sessionMessages, setSessionMessages] = useState<Record<string, ChatMessage[]>>({});
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  function saveSessions(nextSessions: StoredSession[]) {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(nextSessions));
    setSessions(nextSessions);
  }

  function getWindowMs(windowValue: DeleteWindow) {
    if (windowValue === "1h") return 60 * 60 * 1000;
    if (windowValue === "24h") return 24 * 60 * 60 * 1000;
    if (windowValue === "7d") return 7 * 24 * 60 * 60 * 1000;
    return Number.POSITIVE_INFINITY;
  }

  function clearByWindow() {
    if (sessions.length === 0) {
      alert("No hay sesiones para eliminar.");
      return;
    }

    let nextSessions: StoredSession[];

    if (deleteWindow === "Todo") {
      nextSessions = [];
    } else {
      const now = Date.now();
      const windowMs = getWindowMs(deleteWindow);

      nextSessions = sessions.filter((session) => {
        const timestamp = new Date(session.date).getTime();
        if (Number.isNaN(timestamp)) {
          return true;
        }

        return now - timestamp > windowMs;
      });
    }

    const removed = sessions.length - nextSessions.length;
    if (removed === 0) {
      alert("No se encontraron sesiones dentro del rango seleccionado.");
      return;
    }

    saveSessions(nextSessions);
    alert(`Se eliminaron ${removed} sesiones del historial.`);
  }

  useEffect(() => {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as StoredSession[];
        if (Array.isArray(parsed)) {
          setSessions(parsed);
        }
      } catch {
        setSessions([]);
      }
    }

    const rawMessages = localStorage.getItem(SESSION_MESSAGES_STORAGE_KEY);
    if (rawMessages) {
      try {
        const parsedMessages = JSON.parse(rawMessages) as Record<string, ChatMessage[]>;
        if (parsedMessages && typeof parsedMessages === "object") {
          setSessionMessages(parsedMessages);
        }
      } catch {
        setSessionMessages({});
      }
    }
  }, []);

  function toggleSessionDetails(sessionId: string) {
    setExpandedSessions((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }));
  }

  return (
    <StudioChrome activeTab="history">
      <section className="border-b border-line px-5 py-6 dark:border-slate-800">
        <h2 className="text-4xl font-bold">Historial de sesiones</h2>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label htmlFor="history-delete-window" className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            Borrar rango:
          </label>
          <select
            id="history-delete-window"
            value={deleteWindow}
            onChange={(event) => setDeleteWindow(event.target.value as DeleteWindow)}
            className="h-10 rounded-lg border border-line bg-card px-3 text-sm outline-none focus:border-accent dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="1h">Última 1h</option>
            <option value="24h">Últimas 24h</option>
            <option value="7d">Últimos 7 días</option>
            <option value="Todo">Todo</option>
          </select>
          <button
            type="button"
            onClick={clearByWindow}
            className="h-10 rounded-lg border border-red-300 bg-red-50 px-4 text-sm font-semibold text-red-700 transition hover:bg-red-100 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/60"
          >
            Eliminar historial
          </button>
        </div>
      </section>

      <section className="space-y-4 px-4 py-5">
        {sessions.length === 0 ? (
          <article className="rounded-ui border border-line bg-card p-5 text-slate-600 shadow-panel dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            Aún no hay sesiones guardadas.
          </article>
        ) : null}

        {sessions.map((session) => (
          <article
            key={session.id}
            className="rounded-ui border border-line bg-card p-5 shadow-panel dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3 dark:border-slate-700">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{session.id}</p>
              <div className="ml-auto flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    session.status === "FAILED"
                      ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                  }`}
                >
                  {session.status === "FAILED" ? "FALLIDA" : "COMPLETADA"}
                </span>
                <button
                  type="button"
                  onClick={() => toggleSessionDetails(session.id)}
                  className="rounded-lg border border-line bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-accent hover:text-accent dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {expandedSessions[session.id] ? "Ocultar chat" : "Ver chat"}
                </button>
              </div>
            </div>
            <h3 className="mt-4 text-2xl font-semibold">{session.title}</h3>
            <div className="mt-4 grid grid-cols-1 gap-3 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-3">
              <p>Modelo: {session.model}</p>
              <p>Fecha: {formatSessionDate(session.date)}</p>
              <p>Tokens: {session.tokens.toLocaleString()}</p>
            </div>

            {expandedSessions[session.id] ? (
              <div className="mt-4 space-y-3 rounded-xl border border-line/80 bg-slate-950/10 p-3 dark:border-slate-700 dark:bg-slate-950/30">
                {(sessionMessages[session.id] ?? []).length === 0 ? (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    No hay mensajes guardados para esta sesión.
                  </p>
                ) : (
                  (sessionMessages[session.id] ?? []).map((message) => (
                    <article
                      key={message.id}
                      className={`rounded-lg border p-3 ${
                        message.role === "assistant"
                          ? "border-line bg-card dark:border-slate-700 dark:bg-slate-900"
                          : "border-accent bg-accent text-white"
                      }`}
                    >
                      <p className="mb-1 text-xs font-bold uppercase tracking-[0.08em]">
                        {message.role === "assistant" ? "Asistente" : "Usuario"}
                      </p>
                      <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
                    </article>
                  ))
                )}
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </StudioChrome>
  );
}
