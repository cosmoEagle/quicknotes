"use client";
import { useRef } from "react";
import { fileToBase64 } from "@/lib/api";

export type SourceType = "youtube" | "pdf" | "article";

interface Props {
  sourceType: SourceType;
  content: string;
  onSourceTypeChange: (t: SourceType) => void;
  onContentChange: (c: string) => void;
}

const TABS: { id: SourceType; label: string }[] = [
  { id: "youtube",  label: "YouTube" },
  { id: "pdf",      label: "PDF"     },
  { id: "article",  label: "Article" },
];

export default function SourceTabs({ sourceType, content, onSourceTypeChange, onContentChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleTabChange = (tab: SourceType) => {
    onSourceTypeChange(tab);
    onContentChange("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const b64 = await fileToBase64(file);
      onContentChange(b64);
    } catch { /* ignore */ }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Tabs */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          padding: "4px",
          borderRadius: "12px",
          background: "var(--bg-elevated)",
          border: "1px solid var(--border)",
        }}
      >
        {TABS.map((tab) => {
          const active = sourceType === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                flex: 1,
                padding: "7px 0",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: active ? 600 : 400,
                fontFamily: "var(--font-dm-sans)",
                transition: "all 150ms",
                cursor: "pointer",
                background: active ? "var(--accent-faint)" : "transparent",
                color: active ? "var(--accent)" : "var(--text-secondary)",
                border: active ? "1px solid var(--accent-border-dim)" : "1px solid transparent",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Input */}
      {sourceType === "youtube" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <input
            type="url"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "10px",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: "11.5px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
          <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-jetbrains)" }}>
            Must have English captions enabled
          </p>
        </div>
      )}

      {sourceType === "pdf" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileChange} style={{ display: "none" }} />
          <button
            onClick={() => fileRef.current?.click()}
            style={{
              width: "100%",
              padding: "20px 16px",
              borderRadius: "10px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
              border: `1px dashed ${content ? "var(--accent-border)" : "rgba(255,255,255,0.1)"}`,
              background: content ? "var(--accent-faint)" : "rgba(255,255,255,0.01)",
              color: content ? "var(--accent)" : "var(--text-muted)",
              transition: "all 200ms",
            }}
          >
            {content ? (
              <>
                <span style={{ fontSize: "18px" }}>✓</span>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-jetbrains)" }}>
                  PDF loaded · click to replace
                </span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                  <path d="M11 4v10M7 10l4-6 4 6M4 19h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontSize: "11px", fontFamily: "var(--font-jetbrains)" }}>
                  click to upload .pdf
                </span>
              </>
            )}
          </button>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-jetbrains)" }}>
            Text-based PDFs only — scanned/image PDFs won&#39;t work
          </p>
        </div>
      )}

      {sourceType === "article" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <input
            type="url"
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="https://example.com/article"
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "10px",
              fontFamily: "var(--font-jetbrains), monospace",
              fontSize: "11.5px",
              background: "var(--bg-elevated)",
              border: "1px solid var(--border)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
          <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-jetbrains)" }}>
            Blog posts, docs, news articles, Wikipedia
          </p>
        </div>
      )}
    </div>
  );
}
