"use client";

import { useEffect, useMemo, useState } from "react";
import { StudioChrome } from "@/components/studio-chrome";
import { ModelConfigPanel } from "@/components/model-config-panel";

type StoredSession = {
  id: string;
  title: string;
  model: string;
  date: string;
  tokens: number;
  status: "COMPLETED" | "FAILED";
};

type ModelName = "llama-3.1-8b-instant" | "llama-3.3-70b-versatile" | "mixtral-8x7b-32768";

type ModelConfig = {
  model: ModelName;
  temperature: number;
  maxTokens: number;
  topP: number;
};

const SESSION_STORAGE_KEY = "chat_sessions_v1";
const METRICS_CONFIG_STORAGE_KEY = "metrics_model_config_v1";

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

function readStoredSessions() {
  const raw = localStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) return [] as StoredSession[];

  try {
    const parsed = JSON.parse(raw) as StoredSession[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function readModelConfig() {
  const raw = localStorage.getItem(METRICS_CONFIG_STORAGE_KEY);
  if (!raw) return DEFAULT_MODEL_CONFIG;

  try {
    const parsed = JSON.parse(raw) as unknown;
    return isValidModelConfig(parsed) ? normalizeModelConfig(parsed) : DEFAULT_MODEL_CONFIG;
  } catch {
    return DEFAULT_MODEL_CONFIG;
  }
}

function toPolyline(values: number[], maxY: number, width: number, height: number) {
  if (values.length === 0) return "";
  if (values.length === 1) {
    const y = height - (values[0] / maxY) * height;
    return `0,${y} ${width},${y}`;
  }

  return values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - (value / maxY) * height;
      return `${x},${y}`;
    })
    .join(" ");
}

export default function MetricsPage() {
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [modelConfig, setModelConfig] = useState<ModelConfig>(DEFAULT_MODEL_CONFIG);

  useEffect(() => {
    function syncDataFromStorage() {
      setSessions(readStoredSessions());
      setModelConfig(readModelConfig());
    }

    syncDataFromStorage();

    function onStorage(event: StorageEvent) {
      if (event.key === SESSION_STORAGE_KEY || event.key === METRICS_CONFIG_STORAGE_KEY) {
        syncDataFromStorage();
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const chartSeries = useMemo(() => {
    const sorted = [...sessions]
      .filter((session) => Number.isFinite(session.tokens) && session.tokens >= 0)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-8);

    const used = sorted.map((session) => session.tokens);
    const labels = sorted.map((session, index) => {
      const date = new Date(session.date);
      if (Number.isNaN(date.getTime())) {
        return `S${index + 1}`;
      }

      return new Intl.DateTimeFormat("es-CO", {
        day: "2-digit",
        month: "2-digit",
      }).format(date);
    });

    if (used.length === 0) {
      return {
        used: [0, 0],
        labels: ["Inicio", "Ahora"],
      };
    }

    return { used, labels };
  }, [sessions]);

  const tokenLimit = modelConfig.maxTokens;
  const currentUsed = chartSeries.used.at(-1) ?? 0;
  const maxY = Math.max(1000, tokenLimit, ...chartSeries.used, 1);
  const scaleMax = Math.ceil(maxY / 100) * 100;
  const yTicks = Array.from({ length: scaleMax / 100 }, (_, index) => (index + 1) * 100);
  const chartWidth = 100;
  const chartHeight = 44;
  const usedLinePoints = toPolyline(chartSeries.used, scaleMax, chartWidth, chartHeight);
  const limitY = chartHeight - (tokenLimit / scaleMax) * chartHeight;
  const monthlyTarget = 1_000_000;
  const monthlyUsed = sessions.reduce((sum, session) => sum + Math.max(0, session.tokens), 0);
  const usagePercent = Math.min(100, Math.round((monthlyUsed / monthlyTarget) * 100));
  const modelMultiplier =
    modelConfig.model === "llama-3.3-70b-versatile"
      ? 2.3
      : modelConfig.model === "mixtral-8x7b-32768"
        ? 1.7
        : 1;
  const estimatedCost = Number(
    ((modelConfig.maxTokens / 1000) * modelMultiplier * (0.7 + modelConfig.temperature)).toFixed(2),
  );

  return (
    <StudioChrome activeTab="metrics">
      <section className="border-b border-line px-5 py-6 dark:border-slate-800">
        <h2 className="text-4xl font-bold">Analítica y configuración</h2>
        <p className="mt-2 max-w-xl text-slate-600 dark:text-slate-400">
          Monitoreo en tiempo real de consumo de tokens y rendimiento de sesiones.
        </p>
      </section>

      <section className="space-y-4 px-4 py-5">
        <article className="rounded-ui border border-line bg-card p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-5 flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-slate-600 dark:text-slate-400">
              Consumo vs límite de tokens
            </p>
            <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold text-white">En uso</span>
          </div>
          <div className="rounded-xl border border-line/60 bg-slate-950/20 p-3 dark:border-slate-700/70">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-44 w-full" preserveAspectRatio="none">
              {yTicks.map((tick) => {
                const y = chartHeight - (tick / scaleMax) * chartHeight;
                return (
                  <line
                    key={`tick-${tick}`}
                    x1="0"
                    y1={y}
                    x2={chartWidth}
                    y2={y}
                    stroke="rgb(100 116 139 / 0.35)"
                    strokeWidth="0.7"
                  />
                );
              })}
              <line
                x1="0"
                y1={limitY}
                x2={chartWidth}
                y2={limitY}
                stroke="rgb(251 191 36)"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              <polyline
                points={usedLinePoints}
                fill="none"
                stroke="rgb(79 70 229)"
                strokeWidth="1.8"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            </svg>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:grid-cols-4">
              <p>Línea continua: tokens usados</p>
              <p>Línea discontinua: límite de tokens</p>
              <p>Uso actual: {currentUsed.toLocaleString()}</p>
              <p>Escala: 100 a {scaleMax.toLocaleString()}</p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-8">
              {chartSeries.labels.map((label, index) => (
                <p key={`${label}-${index}`} className="truncate text-center">
                  {label}
                </p>
              ))}
            </div>
          </div>
        </article>

        <article className="rounded-ui border border-accent bg-accent p-5 text-white shadow-panel">
          <p className="text-sm uppercase tracking-[0.15em] text-white/85">Tokens totales (sesión)</p>
          <p className="mt-2 text-5xl font-bold">{currentUsed.toLocaleString()}</p>
          <p className="mt-2 text-white/90">Modelo activo: {MODEL_LABELS[modelConfig.model]}</p>
        </article>

        <article className="rounded-ui border border-line bg-card p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400">Costo estimado</p>
          <p className="mt-1 text-4xl font-bold">${estimatedCost}</p>
          <p className="mt-2 text-slate-600 dark:text-slate-400">Basado en la configuración actual del modelo</p>
        </article>

        <article className="rounded-ui border border-line bg-card p-5 dark:border-slate-700 dark:bg-slate-900">
          <p className="text-sm uppercase tracking-[0.15em] text-slate-600 dark:text-slate-400">Uso mensual estimado</p>
          <p className="mt-1 text-4xl font-bold">{monthlyUsed.toLocaleString()} / {monthlyTarget.toLocaleString()}</p>
          <div className="mt-3 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700">
            <div className="h-full rounded-full bg-accent" style={{ width: `${usagePercent}%` }} />
          </div>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">{usagePercent}% consumido del objetivo mensual</p>
        </article>

        <ModelConfigPanel />
      </section>
    </StudioChrome>
  );
}
