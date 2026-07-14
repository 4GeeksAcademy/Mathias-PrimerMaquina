"use client";

import { useEffect, useMemo, useState } from "react";

export type ModelName = "llama-3.1-8b-instant" | "llama-3.3-70b-versatile" | "mixtral-8x7b-32768";

export type ModelConfig = {
  model: ModelName;
  temperature: number;
  maxTokens: number;
  topP: number;
};

const defaultConfig: ModelConfig = {
  model: "llama-3.1-8b-instant",
  temperature: 0.6,
  maxTokens: 1024,
  topP: 0.9,
};

const METRICS_CONFIG_STORAGE_KEY = "metrics_model_config_v1";

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

export function useModelConfig() {
  const [config, setConfig] = useState<ModelConfig>(defaultConfig);
  const [savedConfig, setSavedConfig] = useState<ModelConfig>(defaultConfig);

  useEffect(() => {
    const raw = localStorage.getItem(METRICS_CONFIG_STORAGE_KEY);
    if (!raw) return;

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isValidModelConfig(parsed)) return;

      const normalized = normalizeModelConfig(parsed);
      // Migra configuraciones viejas con campos removidos.
      localStorage.setItem(METRICS_CONFIG_STORAGE_KEY, JSON.stringify(normalized));

      setConfig(normalized);
      setSavedConfig(normalized);
    } catch {
      // Ignorar datos corruptos y conservar defaultConfig.
    }
  }, []);

  function updateConfig<K extends keyof ModelConfig>(key: K, value: ModelConfig[K]) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function saveConfig() {
    localStorage.setItem(METRICS_CONFIG_STORAGE_KEY, JSON.stringify(config));
    setSavedConfig(config);
  }

  function cancelChanges() {
    setConfig(savedConfig);
  }

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(config) !== JSON.stringify(savedConfig),
    [config, savedConfig],
  );

  const estimatedCost = useMemo(() => {
    const base = config.maxTokens / 1000;
    const multiplier = config.model === "llama-3.3-70b-versatile" ? 2.3 : config.model === "mixtral-8x7b-32768" ? 1.7 : 1;
    return Number((base * multiplier * (0.7 + config.temperature)).toFixed(2));
  }, [config]);

  return {
    config,
    estimatedCost,
    updateConfig,
    saveConfig,
    cancelChanges,
    hasUnsavedChanges,
  };
}
