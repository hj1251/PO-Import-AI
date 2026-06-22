import { createContext, useContext, useEffect, useState } from "react";

export type Provider = "openai" | "anthropic" | "demo";

export type AppSettings = {
  provider: Provider;
  token: string;
  model: string;
  systemContext: string;
};

export const DEFAULT_MODELS: Record<string, string> = {
  openai: "gpt-4o-mini",
  anthropic: "claude-3-5-sonnet-latest",
  demo: "",
};

const DEFAULTS: AppSettings = {
  provider: "demo",
  token: "",
  model: "",
  systemContext: "",
};

const STORAGE_KEY = "po-importer-settings";

// localStorage is blocked in the Perplexity sandbox iframe but works fine on
// Vercel (the deploy target). All access is wrapped in try/catch so it
// silently no-ops where unavailable, giving durable settings on Vercel and
// graceful in-session-only behavior in the iframe.
function loadStored(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw);
    return {
      provider: (parsed.provider ?? "demo") as Provider,
      token: parsed.token ?? "",
      model: parsed.model ?? "",
      systemContext: parsed.systemContext ?? "",
    };
  } catch {
    return DEFAULTS;
  }
}

function persist(next: AppSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (e.g. sandboxed iframe) — keep session state only.
  }
}

const SettingsContext = createContext<{
  settings: AppSettings;
  loading: boolean;
  save: (next: AppSettings) => Promise<void>;
}>({ settings: DEFAULTS, loading: false, save: async () => {} });

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  // Client-session settings. Seeded from localStorage when available; no server
  // round-trip. The gear modal edits this in-session state.
  const [settings, setSettings] = useState<AppSettings>(DEFAULTS);
  const [loading, setLoading] = useState(false);

  // Hydrate from localStorage on mount (after first paint, so SSR/iframe safe).
  useEffect(() => {
    setSettings(loadStored());
  }, []);

  const save = async (next: AppSettings) => {
    setSettings(next); // session state
    persist(next); // durable on Vercel, no-op in the iframe
  };

  return (
    <SettingsContext.Provider value={{ settings, loading, save }}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => useContext(SettingsContext);
