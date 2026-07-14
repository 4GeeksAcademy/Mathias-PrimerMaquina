"use client";

import { useEffect, useState } from "react";
import { StudioChrome } from "@/components/studio-chrome";

const models = [
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3 70B",
    description: "Alta inteligencia, ideal para razonamiento complejo y contexto amplio.",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Llama 3 8B",
    description: "Tiempo de respuesta ultrarrápido, perfecto para resúmenes y tareas rápidas.",
  },
  {
    id: "mixtral-8x7b-32768",
    name: "Mixtral 8x7B",
    description: "Excelente equilibrio entre velocidad y rendimiento para escritura creativa.",
  }
];

type ModelName = "llama-3.1-8b-instant" | "llama-3.3-70b-versatile" | "mixtral-8x7b-32768";

type StoredModelConfig = {
  model?: ModelName;
};

const METRICS_CONFIG_STORAGE_KEY = "metrics_model_config_v1";
const DEFAULT_MODEL: ModelName = "llama-3.1-8b-instant";

function isModelName(value: unknown): value is ModelName {
  return (
    value === "llama-3.1-8b-instant" ||
    value === "llama-3.3-70b-versatile" ||
    value === "mixtral-8x7b-32768"
  );
}

export default function SettingsPage() {
  const [selectedModel, setSelectedModel] = useState<ModelName>(DEFAULT_MODEL);

  useEffect(() => {
    function loadSelectedModel() {
      const raw = localStorage.getItem(METRICS_CONFIG_STORAGE_KEY);
      if (!raw) {
        setSelectedModel(DEFAULT_MODEL);
        return;
      }

      try {
        const parsed = JSON.parse(raw) as StoredModelConfig;
        if (isModelName(parsed.model)) {
          setSelectedModel(parsed.model);
          return;
        }
      } catch {
        // Ignora storage invalido y usa default.
      }

      setSelectedModel(DEFAULT_MODEL);
    }

    loadSelectedModel();

    function onStorage(event: StorageEvent) {
      if (event.key === METRICS_CONFIG_STORAGE_KEY) {
        loadSelectedModel();
      }
    }

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <StudioChrome activeTab="settings">
      <section className="border-b border-line px-5 py-6 dark:border-slate-800">
        <h2 className="text-4xl font-bold">Configuración y API</h2>
        <p className="mt-2 max-w-xl text-slate-600 dark:text-slate-400">
          Gestiona tu conexión con Groq Cloud y parámetros del modelo.
        </p>
      </section>

      <section className="space-y-4 px-4 py-5">
        <article className="rounded-ui border border-line bg-card p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-3xl font-semibold">Autenticación</h3>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">Groq API Key</p>
          <input
            readOnly
            value="••••••••••••••••••••••••••••"
            className="mt-2 h-12 w-full rounded-xl border border-line bg-white px-4 text-lg dark:border-slate-700 dark:bg-slate-800"
          />
        </article>

        <article className="rounded-ui border border-line bg-card p-5 dark:border-slate-700 dark:bg-slate-900">
          <h3 className="text-3xl font-semibold">Modelos</h3>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Este valor se cambia a través de configuración de modelos.
          </p>
          <div className="mt-4 space-y-3">
            {models.map((model) => (
              <div
                key={model.name}
                className={`rounded-ui border p-4 ${
                  model.id === selectedModel
                    ? "border-accent bg-accent/10 dark:bg-accent/20"
                    : "border-line dark:border-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xl font-semibold">{model.name}</p>
                  {model.id === selectedModel ? <span className="text-xl text-accent">✓</span> : null}
                </div>
                <p className="mt-2 text-slate-600 dark:text-slate-400">{model.description}</p>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-ui border border-accent bg-accent p-5 text-white shadow-panel">
          <p className="text-sm uppercase tracking-[0.18em] text-white/85">Suscripción activa</p>
          <p className="mt-2 text-5xl font-bold">Pro</p>
          <p className="mt-1 text-white/90">Plan para desarrolladores</p>
          <div className="mt-4 h-2 w-full rounded-full bg-white/30">
            <div className="h-full w-2/3 rounded-full bg-white" />
          </div>
          <p className="mt-2 text-sm text-white/90">Tokens mensuales: 450k / 1M</p>
        </article>
      </section>
    </StudioChrome>
  );
}
