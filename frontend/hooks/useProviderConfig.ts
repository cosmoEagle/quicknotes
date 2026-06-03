"use client";
import { useState, useEffect } from "react";

export interface ProviderConfig {
  provider: string;
  model: string;
  apiKey: string; // derived: apiKeys[provider] ?? "" — do not store directly
}

// Internal storage shape: one key slot per provider
interface StoredConfig {
  provider: string;
  model: string;
  apiKeys: Record<string, string>;
}

const DEFAULTS: StoredConfig = {
  provider: "google_genai",
  model: "gemini-2.5-flash-lite",
  apiKeys: {},
};

const STORAGE_KEY = "qn_provider_config";

export function useProviderConfig() {
  const [stored, setStored] = useState<StoredConfig>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Migrate old single-key format: { provider, model, apiKey } → new per-provider format
        if (typeof parsed.apiKey === "string" && !parsed.apiKeys) {
          const migrated: StoredConfig = {
            provider: parsed.provider ?? DEFAULTS.provider,
            model: parsed.model ?? DEFAULTS.model,
            apiKeys: parsed.apiKey
              ? { [parsed.provider ?? DEFAULTS.provider]: parsed.apiKey }
              : {},
          };
          setStored(migrated);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
        } else {
          setStored({ ...DEFAULTS, ...parsed });
        }
      }
    } catch {
      // ignore
    }
    setLoaded(true);
  }, []);

  // Computed view: expose apiKey as the current provider's stored key
  const config: ProviderConfig = {
    provider: stored.provider,
    model: stored.model,
    apiKey: stored.apiKeys[stored.provider] ?? "",
  };

  const updateConfig = (updates: Partial<ProviderConfig>) => {
    setStored((prev) => {
      const next: StoredConfig = { ...prev, apiKeys: { ...prev.apiKeys } };
      if (updates.provider !== undefined) next.provider = updates.provider;
      if (updates.model !== undefined) next.model = updates.model;
      if (updates.apiKey !== undefined) {
        // Store under the (potentially just-updated) provider key
        next.apiKeys[next.provider] = updates.apiKey;
      }
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
