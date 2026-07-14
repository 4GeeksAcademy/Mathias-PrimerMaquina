"use client";

import { useModelConfig } from "@/hooks/use-model-config";

export function ModelConfigPanel() {
  const { config, estimatedCost, updateConfig, cancelChanges, saveConfig, hasUnsavedChanges } = useModelConfig();

  return (
    <article className="rounded-ui border border-line bg-card p-5 dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-5 flex items-center justify-between">
        <h3 className="text-2xl font-bold">Configuración del modelo</h3>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm font-semibold">
          <span className="text-slate-600 dark:text-slate-300">Modelo</span>
          <select
            value={config.model}
            onChange={(event) => updateConfig("model", event.target.value as typeof config.model)}
            className="h-11 w-full rounded-xl border border-line bg-white px-3 dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant</option>
            <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile</option>
            <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
          </select>
        </label>

        <label className="space-y-2 text-sm font-semibold">
          <span className="text-slate-600 dark:text-slate-300">Máximo de tokens ({config.maxTokens})</span>
          <input
            type="range"
            min={128}
            max={4096}
            step={64}
            value={config.maxTokens}
            onChange={(event) => updateConfig("maxTokens", Number(event.target.value))}
            className="w-full"
          />
        </label>

        <label className="space-y-2 text-sm font-semibold">
          <span className="text-slate-600 dark:text-slate-300">Temperatura ({config.temperature.toFixed(1)})</span>
          <input
            type="range"
            min={0}
            max={1.5}
            step={0.1}
            value={config.temperature}
            onChange={(event) => updateConfig("temperature", Number(event.target.value))}
            className="w-full"
          />
        </label>

        <label className="space-y-2 text-sm font-semibold">
          <span className="text-slate-600 dark:text-slate-300">Top P ({config.topP.toFixed(2)})</span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={config.topP}
            onChange={(event) => updateConfig("topP", Number(event.target.value))}
            className="w-full"
          />
        </label>
      </div>

      <pre className="mt-4 overflow-x-auto rounded-xl border border-line bg-slate-950 p-4 text-xs text-emerald-300 dark:border-slate-700">
{JSON.stringify(config, null, 2)}
      </pre>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={cancelChanges}
          disabled={!hasUnsavedChanges}
          className="h-11 rounded-xl border border-line bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={saveConfig}
          disabled={!hasUnsavedChanges}
          className="h-11 rounded-xl bg-accent px-6 text-sm font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Guardar
        </button>
      </div>
    </article>
  );
}
