"use client";
import { useState } from "react";
import { useProviderConfig, PROVIDERS } from "@/hooks/useProviderConfig";

export default function ProviderPanel() {
  const { config, updateConfig, loaded } = useProviderConfig();
  const [open, setOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const currentProvider = PROVIDERS.find((p) => p.id === config.provider) ?? PROVIDERS[0];
  // Guard with `loaded` so SSR and first client render agree (localStorage not available on server)
  const hasKey = loaded && !!config.apiKey;
  const maskedKey = hasKey
    ? config.apiKey.slice(0, 5) + "●●●" + config.apiKey.slice(-2)
    : "no key set";

  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          padding: "6px 12px",
          borderRadius: "8px",
          fontSize: "11px",
          fontFamily: "var(--font-jetbrains), monospace",
          cursor: "pointer",
          transition: "all 150ms",
          border: hasKey ? "1px solid var(--border)" : "1px solid var(--error-border)",
          background: open ? "var(--bg-elevated)" : "rgba(255,255,255,0.02)",
          color: hasKey ? "var(--text-secondary)" : "var(--error)",
        }}
      >
        <span
          className="pulse-dot"
          style={{
            display: "inline-block",
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            flexShrink: 0,
            background: hasKey ? "var(--accent)" : "var(--error)",
          }}
        />
        <span>{currentProvider.label} / {config.model}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 150ms" }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      {open && (
        <>
          <div
            style={{ position: "fixed", inset: 0, zIndex: 40 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 8px)",
              zIndex: 50,
              width: "300px",
              padding: "20px",
              borderRadius: "14px",
              background: "rgba(13,13,13,0.96)",
              border: "1px solid var(--accent-border-dim)",
              boxShadow: "0 20px 52px rgba(0,0,0,0.65), 0 0 0 1px rgba(16,217,160,0.04)",
              backdropFilter: "blur(18px)",
            }}
          >
            <p className="section-label" style={{ marginBottom: "10px" }}>PROVIDER</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "16px" }}>
              {PROVIDERS.map((p) => {
                const active = config.provider === p.id;
                return (
                  <button
                    key={p.id}
                    onClick={() => updateConfig({ provider: p.id, model: p.models[0] })}
                    style={{
                      padding: "8px 12px",
                      fontSize: "12px",
                      borderRadius: "8px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 150ms",
                      fontFamily: "var(--font-dm-sans)",
                      fontWeight: active ? 600 : 400,
                      border: active ? "1px solid var(--accent-border)" : "1px solid var(--border)",
                      background: active ? "var(--accent-faint)" : "rgba(255,255,255,0.02)",
                      color: active ? "var(--accent)" : "var(--text-secondary)",
                    }}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            <p className="section-label" style={{ marginBottom: "8px" }}>MODEL</p>
            <select
              value={config.model}
              onChange={(e) => updateConfig({ model: e.target.value })}
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "11.5px",
                fontFamily: "var(--font-jetbrains), monospace",
                appearance: "none",
                background: "var(--bg-elevated)",
                border: "1px solid var(--border)",
                color: "var(--text-primary)",
                cursor: "pointer",
              }}
            >
              {currentProvider.models.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <p className="section-label" style={{ marginBottom: "8px" }}>API KEY</p>
            <div style={{ display: "flex", gap: "6px" }}>
              <input
                type={showKey ? "text" : "password"}
                value={config.apiKey}
                onChange={(e) => updateConfig({ apiKey: e.target.value })}
                placeholder={currentProvider.keyPlaceholder}
                style={{
                  flex: 1,
                  padding: "8px 12px",
                  borderRadius: "8px",
                  fontSize: "11.5px",
                  fontFamily: "var(--font-jetbrains), monospace",
                  background: "var(--bg-elevated)",
                  border: "1px solid var(--border)",
                  color: "var(--text-primary)",
                  outline: "none",
                }}
              />
              <button
                onClick={() => setShowKey((v) => !v)}
                style={{
                  padding: "0 10px",
                  borderRadius: "8px",
                  fontSize: "11px",
                  fontFamily: "var(--font-dm-sans)",
                  cursor: "pointer",
                  border: "1px solid var(--border)",
                  color: "var(--text-muted)",
                  background: "var(--bg-elevated)",
                }}
              >
                {showKey ? "hide" : "show"}
              </button>
            </div>

            <p style={{ marginTop: "8px", fontSize: "11px", color: "var(--text-muted)" }}>
              Saved in browser only.{" "}
              <a
                href={currentProvider.keyLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "var(--accent)", textDecoration: "underline" }}
              >
                Get a key →
              </a>
            </p>

            <div
              style={{
                marginTop: "14px",
                paddingTop: "12px",
                borderTop: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "11px",
                fontFamily: "var(--font-jetbrains)",
                color: "var(--text-muted)",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  flexShrink: 0,
                  background: hasKey ? "var(--accent)" : "var(--error)",
                }}
              />
              {hasKey ? maskedKey : "enter api key to continue"}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
