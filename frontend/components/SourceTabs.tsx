"use client";
import { useRef, useState } from "react";
import { fileToBase64 } from "@/lib/api";

const PDF_MAX_BYTES = 4 * 1024 * 1024; // 4 MB

export type SourceType = "youtube" | "pdf" | "article" | "text";

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

const TAB_IDS = TABS.map((t) => t.id);

export default function SourceTabs({ sourceType, content, onSourceTypeChange, onContentChange }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [pdfError, setPdfError] = useState("");
  const isTextMode = sourceType === "text";
  const activeTab = TAB_IDS.includes(sourceType) ? sourceType : "youtube";

  const handleTabChange = (tab: SourceType) => {
    onSourceTypeChange(tab);
    onContentChange("");
  };

  const handleTextToggle = () => {
    onSourceTypeChange("text");
    onContentChange("");
  };

  const handleBackToTabs = () => {
    onSourceTypeChange(activeTab as SourceType);
    onContentChange("");
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > PDF_MAX_BYTES) {
      setPdfError(`PDF is ${(file.size / 1024 / 1024).toFixed(1)} MB — max is 4 MB. Compress or split it first.`);
      onContentChange("");
      e.target.value = "";
      return;
    }
    setPdfError("");
    try {
      const b64 = await fileToBase64(file);
      onContentChange(b64);
    } catch { /* ignore */ }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>

      {/* Grid stack — both sections occupy the same space, crossfade via opacity */}
      <div style={{ display: "grid" }}>

        {/* Tab section */}
        <div style={{
          gridArea: "1 / 1",
          display: "flex", flexDirection: "column", gap: "12px",
          opacity: isTextMode ? 0 : 1,
          pointerEvents: isTextMode ? "none" : "auto",
          transition: "opacity 150ms ease",
        }}>
          <div style={{
            display: "flex", gap: "4px", padding: "4px",
            borderRadius: "12px", background: "var(--bg-elevated)", border: "1px solid var(--border)",
          }}>
            {TABS.map((tab) => {
              const active = sourceType === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  style={{
                    flex: 1, padding: "7px 0", borderRadius: "8px", fontSize: "12px",
                    fontWeight: active ? 600 : 400, fontFamily: "var(--font-dm-sans)",
                    transition: "all 150ms", cursor: "pointer",
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

          {sourceType === "youtube" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <input
                type="url"
                value={content}
                onChange={(e) => onContentChange(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                style={{
                  width: "100%", padding: "10px 14px", borderRadius: "10px",
                  fontFamily: "var(--font-jetbrains), monospace", fontSize: "11.5px",
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", outline: "none",
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
                  width: "100%", padding: "20px 16px", borderRadius: "10px",
                  display: "flex", flexDirection: "column", alignItems: "center", gap: "8px",
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
                    <span style={{ fontSize: "11px", fontFamily: "var(--font-jetbrains)" }}>PDF loaded · click to replace</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 22 22" fill="none">
                      <path d="M11 4v10M7 10l4-6 4 6M4 19h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    <span style={{ fontSize: "11px", fontFamily: "var(--font-jetbrains)" }}>click to upload .pdf</span>
                  </>
                )}
              </button>
              {pdfError ? (
                <p style={{ fontSize: "11px", color: "var(--error)", fontFamily: "var(--font-jetbrains)" }}>
                  {pdfError}
                </p>
              ) : (
                <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-jetbrains)" }}>
                  Text-based PDFs only · max 4 MB
                </p>
              )}
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
                  width: "100%", padding: "10px 14px", borderRadius: "10px",
                  fontFamily: "var(--font-jetbrains), monospace", fontSize: "11.5px",
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                  color: "var(--text-primary)", outline: "none",
                }}
              />
              <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-jetbrains)" }}>
                Blog posts, docs, news articles, Wikipedia
              </p>
            </div>
          )}
        </div>

        {/* Text section */}
        <div style={{
          gridArea: "1 / 1",
          display: "flex", flexDirection: "column", gap: "6px",
          opacity: isTextMode ? 1 : 0,
          pointerEvents: isTextMode ? "auto" : "none",
          transition: "opacity 150ms ease",
        }}>
          <textarea
            value={content}
            onChange={(e) => onContentChange(e.target.value)}
            placeholder="Paste your text here — articles, transcripts, notes, documentation…"
            rows={3}
            style={{
              width: "100%", padding: "10px 14px", borderRadius: "10px",
              resize: "none", fontFamily: "var(--font-dm-sans)", fontSize: "12px",
              lineHeight: 1.6, background: "var(--bg-elevated)", border: "1px solid var(--border)",
              color: "var(--text-primary)", outline: "none",
            }}
          />
          <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-jetbrains)" }}>
            Plain text, markdown, code — anything readable
          </p>
        </div>
      </div>

      {/* Toggle — divider style */}
      {!isTextMode ? (
        <div
          role="button"
          tabIndex={0}
          onClick={handleTextToggle}
          onKeyDown={(e) => e.key === "Enter" && handleTextToggle()}
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "2px 0" }}
        >
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span style={{
            fontSize: "11px",
            fontFamily: "var(--font-jetbrains)",
            color: "var(--text-secondary)",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            padding: "3px 8px",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
            transition: "border-color 150ms, color 150ms",
          }}>
            ✎ paste text directly
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>
      ) : (
        <div
          role="button"
          tabIndex={0}
          onClick={handleBackToTabs}
          onKeyDown={(e) => e.key === "Enter" && handleBackToTabs()}
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", padding: "2px 0" }}
        >
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
          <span style={{
            fontSize: "11px",
            fontFamily: "var(--font-jetbrains)",
            color: "var(--text-secondary)",
            letterSpacing: "0.04em",
            whiteSpace: "nowrap",
            padding: "3px 8px",
            borderRadius: "6px",
            border: "1px solid var(--border)",
            background: "var(--bg-elevated)",
          }}>
            ← URL or file instead
          </span>
          <div style={{ flex: 1, height: "1px", background: "var(--border)" }} />
        </div>
      )}
    </div>
  );
}
