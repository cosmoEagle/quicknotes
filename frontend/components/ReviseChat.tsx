"use client";
import { useRef, useEffect, useState } from "react";

export interface ChatTurn {
  role: string; // "user" | "assistant"
  text: string;
}

interface Props {
  history: ChatTurn[];
  isRevising: boolean;
  status: string;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSend: (instruction: string) => void;
}

export default function ReviseChat({ history, isRevising, status, collapsed, onToggleCollapse, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const threadRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!collapsed && threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [history.length, isRevising, collapsed]);

  const send = () => {
    const text = draft.trim();
    if (!text || isRevising) return;
    onSend(text);
    setDraft("");
  };

  return (
    <div style={{ borderTop: "1px solid var(--border)", background: "rgba(17,17,17,0.55)", flexShrink: 0 }}>
      {/* Header / toggle */}
      <button
        onClick={onToggleCollapse}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 20px", background: "transparent", border: "none", cursor: "pointer",
        }}
      >
        <span className="section-label">REFINE WITH AI</span>
        <span style={{
          fontSize: "10px", fontFamily: "var(--font-jetbrains)", color: "var(--text-muted)",
          transform: collapsed ? "rotate(0deg)" : "rotate(180deg)", transition: "transform 150ms",
        }}>▾</span>
      </button>

      {!collapsed && (
        <div style={{ padding: "0 16px 14px" }}>
          {/* Thread */}
          <div ref={threadRef} style={{ maxHeight: "220px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px", marginBottom: "10px" }}>
            {history.length === 0 && !isRevising && (
              <p style={{ fontSize: "11px", fontFamily: "var(--font-jetbrains)", color: "var(--text-muted)", padding: "8px 2px" }}>
                Ask for changes — e.g. &quot;make it shorter&quot;, &quot;add a TL;DR&quot;, &quot;turn into bullets&quot;.
              </p>
            )}
            {history.map((turn, i) => {
              const isUser = turn.role === "user";
              return (
                <div key={i} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                  <div style={{
                    maxWidth: "85%", padding: "7px 11px", borderRadius: "10px", fontSize: "12px", lineHeight: 1.5,
                    fontFamily: "var(--font-dm-sans)",
                    background: isUser ? "var(--accent-faint)" : "var(--bg-elevated)",
                    border: isUser ? "1px solid var(--accent-border-dim)" : "1px solid var(--border)",
                    color: isUser ? "var(--text-primary)" : "var(--text-secondary)",
                  }}>
                    {turn.text}
                  </div>
                </div>
              );
            })}
            {isRevising && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: "6px", padding: "7px 11px", borderRadius: "10px",
                  fontSize: "11px", fontFamily: "var(--font-jetbrains)", color: "var(--streaming)",
                  background: "var(--bg-elevated)", border: "1px solid var(--border)",
                }}>
                  <span className="pulse-dot" style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--streaming)" }} />
                  {status || "Revising…"}
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Tell the AI what to change…"
              disabled={isRevising}
              style={{
                flex: 1, padding: "9px 12px", borderRadius: "9px", fontSize: "12px",
                fontFamily: "var(--font-dm-sans)", background: "var(--bg-elevated)",
                border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none",
                opacity: isRevising ? 0.5 : 1,
              }}
            />
            <button
              onClick={send}
              disabled={isRevising || !draft.trim()}
              style={{
                padding: "9px 16px", borderRadius: "9px", fontSize: "12px", fontWeight: 600,
                fontFamily: "var(--font-dm-sans)",
                cursor: (isRevising || !draft.trim()) ? "not-allowed" : "pointer",
                opacity: (isRevising || !draft.trim()) ? 0.4 : 1,
                border: "1px solid var(--accent-border)", color: "var(--accent)",
                background: "var(--accent-faint)", transition: "all 150ms",
              }}
            >
              send
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
