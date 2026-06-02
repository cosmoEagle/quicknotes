"use client";
import { useState, useEffect } from "react";

export interface ProviderConfig {
  provider: string;
  model: string;
  apiKey: string;
}

const DEFAULT_CONFIG: ProviderConfig = {
  provider: "google_genai",
  model: "gemini-2.5-flash-lite",
  apiKey: "",
};

const STORAGE_KEY = "qn_provider_config";

export function useProviderConfig() {
  const [config, setConfig] = useState<ProviderConfig>(DEFAULT_CONFIG);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setConfig(JSON.parse(stored));
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  const updateConfig = (updates: Partial<ProviderConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...updates };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  return { config, updateConfig, loaded };
}

export const PROVIDERS = [
  {
    id: "google_genai",
    label: "Gemini",
    models: ["gemini-2.5-flash-lite", "gemini-2.0-flash", "gemini-2.0-flash-lite", "gemini-1.5-pro"],
    keyPlaceholder: "AIza...",
    keyLink: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "openai",
    label: "OpenAI",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo"],
    keyPlaceholder: "sk-...",
    keyLink: "https://platform.openai.com/api-keys",
  },
  {
    id: "anthropic",
    label: "Anthropic",
    models: ["claude-3-5-haiku-20241022", "claude-3-5-sonnet-20241022", "claude-3-opus-20240229"],
    keyPlaceholder: "sk-ant-...",
    keyLink: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "groq",
    label: "Groq",
    models: ["llama-3.1-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    keyPlaceholder: "gsk_...",
    keyLink: "https://console.groq.com/keys",
  },
];
