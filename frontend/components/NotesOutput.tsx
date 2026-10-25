"use client";
import { useRef, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import FlashcardViewer, { Card } from "./FlashcardViewer";
import FloatingYouTubePlayer, { SeekRequest } from "./FloatingYouTubePlayer";

function extractVideoId(url: string): string | null {
  const m = url.match(/(?:youtube\.com\/watch\?(?:.*&)?v=|youtu\.be\/|youtube\.com\/(?:embed|shorts|live)\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

interface Props {
  notes: string;
  status: string;
  isStreaming: boolean;
  isError: boolean;
  style: string;
  cards: Card[];
  isEditing: boolean;
  onToggleEdit: () => void;
  onNotesChange: (s: string) => void;
  onCardEdit: (index: number, field: "question" | "answer", value: string) => void;
  sourceType: string;
  videoUrl: string;
}

export default function NotesOutput({
  notes, status, isStreaming, isError, style, cards,
  isEditing, onToggleEdit, onNotesChange, onCardEdit,
  sourceType, videoUrl,
}: Props) {
  const hasContent = notes.length > 0;
  const scrollRef = useRef<HTMLDivElement>(null);
  const [seekTo, setSeekTo] = useState<SeekRequest | null>(null);
  const [playerOpen, setPlayerOpen] = useState(false);

  // Auto-scroll to bottom as tokens arrive
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [notes, isStreaming]);

  // Flashcard mode owns its own panel (error still takes precedence).
  if (style === "flashcard" && !isError) {
    return (
      <FlashcardViewer
        cards={cards}
        isStreaming={isStreaming}
        status={status}
        isEditing={isEditing}
        onToggleEdit={onToggleEdit}
        onCardEdit={onCardEdit}
      />
    );
  }

  const handleDownload = () => {
    const blob = new Blob([notes], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notes.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = async () => {
    try { await navigator.clipboard.writeText(notes); } catch { /* ignore */ }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 20px",
        borderBottom: "1px solid var(--border)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="section-label">OUTPUT</span>

          {isStreaming && (
            <span style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "11px",
              fontFamily: "var(--font-jetbrains)",
              color: "var(--streaming)",
            }}>
              <span className="pulse-dot" style={{
                display: "inline-block",
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: "var(--streaming)",
                flexShrink: 0,
              }} />
              {status}
            </span>
          )}

          {!isStreaming && hasContent && !isError && (
            <span style={{
              fontSize: "11px",
              fontFamily: "var(--font-jetbrains)",
              color: "var(--accent)",
            }}>
              ✓ ready
            </span>
          )}
        </div>

        {hasContent && !isStreaming && !isError && (
          <div style={{ display: "flex", gap: "8px" }}>
            {style === "timestamped" && sourceType === "youtube" && extractVideoId(videoUrl) && (
              <button
                onClick={() => setPlayerOpen((v) => !v)}
                style={{
                  padding: "5px 14px", borderRadius: "8px", fontSize: "11px",
                  fontFamily: "var(--font-dm-sans)", cursor: "pointer",
                  border: playerOpen ? "1px solid var(--accent-border)" : "1px solid var(--border)",
                  color: playerOpen ? "var(--accent)" : "var(--text-secondary)",
                  background: playerOpen ? "var(--accent-faint)" : "transparent",
                  transition: "all 150ms",
                }}
              >
                ▶ video
              </button>
            )}
            <button
              onClick={onToggleEdit}
              style={{
                padding: "5px 14px", borderRadius: "8px", fontSize: "11px",
                fontFamily: "var(--font-dm-sans)", cursor: "pointer",
                border: isEditing ? "1px solid var(--accent-border)" : "1px solid var(--border)",
                color: isEditing ? "var(--accent)" : "var(--text-secondary)",
                background: isEditing ? "var(--accent-faint)" : "transparent", transition: "all 150ms",
              }}
            >
              {isEditing ? "✓ done" : "✎ edit"}
            </button>
            <button
              onClick={handleCopy}
              style={{
                padding: "5px 14px", borderRadius: "8px", fontSize: "11px",
                fontFamily: "var(--font-dm-sans)", cursor: "pointer",
                border: "1px solid var(--border)", color: "var(--text-secondary)",
                background: "transparent", transition: "all 150ms",
              }}
            >
              ⎘ copy
            </button>
            <button
              onClick={handleDownload}
              style={{
                padding: "5px 14px", borderRadius: "8px", fontSize: "11px",
                fontWeight: 600, fontFamily: "var(--font-dm-sans)", cursor: "pointer",
                border: "1px solid var(--accent-border)", color: "var(--accent)",
                background: "var(--accent-faint)", boxShadow: "0 0 14px var(--accent-glow)",
                transition: "all 150ms",
              }}
            >
              ↓ export .md
            </button>
          </div>
        )}
      </div>

      {/* Body */}
      <div
        ref={scrollRef}
        className="scanlines"
        style={{ flex: 1, overflowY: "auto", padding: "24px 28px", minHeight: 0 }}
      >
        {/* Empty state */}
        {!hasContent && !isStreaming && !isError && (
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            justifyContent: "center", height: "100%", gap: "16px",
            opacity: 0.4, userSelect: "none",
          }}>
            <svg width="44" height="44" viewBox="0 0 44 44" fill="none" style={{ color: "var(--text-muted)" }}>
              <rect x="8" y="6" width="28" height="32" rx="3" stroke="currentColor" strokeWidth="1.5" />
              <path d="M14 16h16M14 22h16M14 28h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: "13px", fontWeight: 500, marginBottom: "6px", fontFamily: "var(--font-syne)", color: "var(--text-muted)" }}>
                Notes will appear here
              </p>
              <p style={{ fontSize: "11px", fontFamily: "var(--font-jetbrains)", color: "var(--text-muted)" }}>
                streamed live as they&#39;re generated
              </p>
            </div>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div style={{
            padding: "16px", borderRadius: "12px",
            background: "var(--error-glow)", border: "1px solid var(--error-border)",
          }}>
            <p style={{ fontSize: "11px", fontWeight: 600, marginBottom: "6px", fontFamily: "var(--font-jetbrains)", color: "var(--error)" }}>
              Error
            </p>
            <p style={{ fontSize: "12px", lineHeight: 1.6, color: "var(--text-secondary)" }}>
              {notes}
            </p>
          </div>
        )}

        {/* Streaming: raw pre-formatted text for instant per-token rendering */}
        {hasContent && !isError && isStreaming && (
          <pre style={{
            fontFamily: "var(--font-jetbrains), monospace",
            fontSize: "12.5px",
            lineHeight: 1.8,
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            color: "var(--text-primary)",
            margin: 0,
          }}>
            {notes}
            <span className="cursor-blink" style={{ color: "var(--accent)" }}>█</span>
          </pre>
        )}

        {/* Manual edit: raw textarea bound to notes */}
        {hasContent && !isError && !isStreaming && isEditing && (
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%", minHeight: "100%", resize: "none",
              fontFamily: "var(--font-jetbrains), monospace", fontSize: "12.5px", lineHeight: 1.7,
              background: "transparent", border: "none", outline: "none", color: "var(--text-primary)",
            }}
          />
        )}

        {/* Floating YouTube popup — rendered outside isEditing gate so the player
            stays alive (and the video keeps playing) while the user edits the note. */}
        {style === "timestamped" && sourceType === "youtube" && playerOpen && hasContent && !isError && (() => {
          const vid = extractVideoId(videoUrl);
          return vid ? (
            <FloatingYouTubePlayer
              videoId={vid}
              seekTo={seekTo}
              onClose={() => setPlayerOpen(false)}
            />
          ) : null;
        })()}

        {/* Done: full markdown rendering */}
        {hasContent && !isError && !isStreaming && !isEditing && (
          <div className="md-output">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h2: ({ children }) => {
                  const text = String(children);
                  // [MM:SS], [H:MM:SS] or [MMM:SS]
                  const m = text.match(/^\[?(?:(\d{1,2}):)?(\d{1,3}):(\d{2})\]?\s*(.*)$/);
                  if (m) {
                    const [, h, mins, s, rest] = m;
                    const secs = (h ? parseInt(h) * 3600 : 0) + parseInt(mins) * 60 + parseInt(s);
                    const ts = h ? `${h}:${mins.padStart(2, "0")}:${s}` : `${mins.padStart(2, "0")}:${s}`;
                    return (
                      <h2>
                        <button
                          onClick={() => {
                            setSeekTo(prev => ({ secs, id: (prev?.id ?? 0) + 1 }));
                            setPlayerOpen(true);
                          }}
                          title={`Jump to ${ts}`}
                          style={{
                            fontFamily: "var(--font-jetbrains)",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                            color: "var(--accent)",
                            background: "var(--accent-faint)",
                            border: "1px solid var(--accent-border-dim)",
                            borderRadius: "5px",
                            padding: "1px 7px",
                            cursor: "pointer",
                            marginRight: "8px",
                            transition: "all 120ms",
                          }}
                        >
                          {ts}
                        </button>
                        {rest}
                      </h2>
                    );
                  }
                  return <h2>{children}</h2>;
                },
              }}
            >
              {notes}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}
