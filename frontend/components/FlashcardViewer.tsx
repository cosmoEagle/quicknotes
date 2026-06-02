"use client";
import { useRef, useEffect, useState, useMemo } from "react";

export interface Card {
  question: string;
  answer: string;
  type: string;
}

interface Props {
  cards: Card[];
  isStreaming: boolean;
  status: string;
  isEditing?: boolean;
  onToggleEdit?: () => void;
  onCardEdit?: (index: number, field: "question" | "answer", value: string) => void;
}

const TYPE_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  definition: { bg: "rgba(16,217,160,0.08)",  color: "var(--accent)", border: "rgba(16,217,160,0.2)" },
  why:        { bg: "rgba(248,113,113,0.08)", color: "var(--error)",  border: "rgba(248,113,113,0.2)" },
  how:        { bg: "rgba(168,85,247,0.08)",  color: "#c084fc",       border: "rgba(168,85,247,0.2)" },
  compare:    { bg: "rgba(96,165,250,0.08)",  color: "#60a5fa",       border: "rgba(96,165,250,0.2)" },
  apply:      { bg: "rgba(251,191,36,0.08)",  color: "#fbbf24",       border: "rgba(251,191,36,0.2)" },
};

function typeStyle(t: string) {
  return TYPE_STYLES[t] ?? TYPE_STYLES.definition;
}

// Pure: build an Anki-importable tab-separated file from selected cards.
// Header directives let Anki map columns with zero manual configuration:
//   col 1 -> Front, col 2 -> Back, col 3 -> Tags.
export function buildAnkiTxt(cards: Card[]): string {
  const header = ["#separator:tab", "#html:false", "#tags column:3"].join("\n");
  const clean = (s: string) => s.replace(/\t/g, " ").replace(/\r?\n/g, " ").trim();
  const rows = cards.map((c) => `${clean(c.question)}\t${clean(c.answer)}\t${clean(c.type)}`);
  return `${header}\n${rows.join("\n")}\n`;
}

export default function FlashcardViewer({ cards, isStreaming, status, isEditing = false, onToggleEdit, onCardEdit }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const prevLen = useRef(0);

  // Keep selection in sync with the cards list. Cards only ever append during a
  // single generation, but the parent resets to [] on "New"/regenerate while this
  // component stays mounted — so we must also reset when the list shrinks.
  useEffect(() => {
    if (cards.length < prevLen.current) {
      // New generation (or cleared): drop stale selection and re-baseline.
      setSelected(new Set());
      prevLen.current = 0;
    }
    if (cards.length > prevLen.current) {
      // Auto-select newly arrived cards.
      setSelected((prev) => {
        const next = new Set(prev);
        for (let i = prevLen.current; i < cards.length; i++) next.add(i);
        return next;
      });
      prevLen.current = cards.length;
    }
  }, [cards.length]);

  // Auto-scroll while streaming.
  useEffect(() => {
    if (isStreaming && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [cards.length, isStreaming]);

  const toggle = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(cards.map((_, i) => i)));
  const deselectAll = () => setSelected(new Set());

  const selectedCards = useMemo(
    () => cards.filter((_, i) => selected.has(i)),
    [cards, selected]
  );

  const handleCopy = async () => {
    if (selectedCards.length === 0) return;
    const text = selectedCards.map((c) => `Q: ${c.question}\nA: ${c.answer}`).join("\n\n");
    try { await navigator.clipboard.writeText(text); } catch { /* ignore */ }
  };

  const handleExport = () => {
    if (selectedCards.length === 0) return;
    const blob = new Blob([buildAnkiTxt(selectedCards)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "flashcards.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  // Empty/loading state (streaming with no cards yet).
  if (cards.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <span className="section-label">FLASHCARDS</span>
          {isStreaming && (
            <span style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "11px", fontFamily: "var(--font-jetbrains)", color: "var(--streaming)" }}>
              <span className="pulse-dot" style={{ display: "inline-block", width: "6px", height: "6px", borderRadius: "50%", background: "var(--streaming)", flexShrink: 0 }} />
              {status || "Generating cards…"}
            </span>
          )}
        </div>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.4, fontSize: "12px", fontFamily: "var(--font-jetbrains)", color: "var(--text-muted)" }}>
          {isStreaming ? "waiting for cards…" : "no cards yet"}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <span className="section-label">FLASHCARDS</span>
          <span style={{ fontSize: "11px", fontFamily: "var(--font-jetbrains)", color: "var(--text-muted)" }}>
            {cards.length} generated · {selected.size} selected
          </span>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {onToggleEdit && (
            <button
              onClick={onToggleEdit}
              style={{
                ...btnSm,
                border: isEditing ? "1px solid var(--accent-border)" : "1px solid var(--border)",
                color: isEditing ? "var(--accent)" : "var(--text-secondary)",
                background: isEditing ? "var(--accent-faint)" : "transparent",
              }}
            >
              {isEditing ? "✓ done" : "✎ edit"}
            </button>
          )}
          <button onClick={selectAll} style={btnSm}>select all</button>
          <button onClick={deselectAll} style={btnSm}>deselect all</button>
          <button onClick={handleCopy} style={btnSm}>⎘ copy</button>
        </div>
      </div>

      {/* Card list */}
      <div ref={scrollRef} className="scanlines" style={{ flex: 1, overflowY: "auto", padding: "12px", minHeight: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
        {cards.map((card, i) => {
          const isSel = selected.has(i);
          const ts = typeStyle(card.type);
          return (
            <div
              key={i}
              onClick={() => { if (!isEditing) toggle(i); }}
              style={{
                display: "flex", alignItems: "flex-start", gap: "12px",
                padding: "12px 14px", borderRadius: "10px", cursor: isEditing ? "default" : "pointer",
                border: isSel ? "1px solid var(--accent-border)" : "1px solid transparent",
                background: isSel ? "var(--accent-faint)" : "transparent",
                transition: "all 120ms",
              }}
            >
              <div style={{
                width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0, marginTop: "1px",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", fontWeight: 700,
                border: isSel ? "1.5px solid var(--accent)" : "1.5px solid var(--border)",
                background: isSel ? "var(--accent)" : "transparent",
                color: isSel ? "#090909" : "transparent",
              }}>
                ✓
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <span style={{
                  display: "inline-block", fontSize: "9px", fontFamily: "var(--font-jetbrains)",
                  padding: "1px 6px", borderRadius: "4px", marginBottom: "5px",
                  background: ts.bg, color: ts.color, border: `1px solid ${ts.border}`,
                }}>
                  {card.type}
                </span>
                {isEditing ? (
                  <>
                    <textarea
                      value={card.question}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onCardEdit?.(i, "question", e.target.value)}
                      spellCheck={false}
                      style={{
                        width: "100%", resize: "vertical", minHeight: "38px", marginBottom: "6px",
                        fontFamily: "var(--font-dm-sans)", fontSize: "12px", fontWeight: 500, lineHeight: 1.5,
                        background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px",
                        color: "var(--text-primary)", outline: "none", padding: "6px 8px",
                      }}
                    />
                    <textarea
                      value={card.answer}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onCardEdit?.(i, "answer", e.target.value)}
                      spellCheck={false}
                      style={{
                        width: "100%", resize: "vertical", minHeight: "44px",
                        fontFamily: "var(--font-jetbrains)", fontSize: "11px", lineHeight: 1.6,
                        background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: "6px",
                        color: "var(--text-secondary)", outline: "none", padding: "6px 8px",
                      }}
                    />
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", marginBottom: "4px", lineHeight: 1.5 }}>
                      {card.question}
                    </div>
                    <div style={{ fontSize: "11px", color: "var(--text-secondary)", lineHeight: 1.6, fontFamily: "var(--font-jetbrains)" }}>
                      {card.answer}
                    </div>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ padding: "12px 20px", borderTop: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: "11px", color: "var(--text-secondary)" }}>
          <strong style={{ color: "var(--accent)" }}>{selected.size}</strong> / {cards.length} cards selected
        </span>
        <button
          onClick={handleExport}
          disabled={selected.size === 0}
          style={{
            padding: "8px 18px", borderRadius: "9px", fontSize: "12px", fontWeight: 600,
            fontFamily: "var(--font-dm-sans)",
            cursor: selected.size === 0 ? "not-allowed" : "pointer",
            opacity: selected.size === 0 ? 0.4 : 1,
            border: "1px solid var(--accent-border)", color: "var(--accent)",
            background: "var(--accent-faint)", boxShadow: "0 0 14px var(--accent-glow)",
            transition: "all 150ms",
          }}
        >
          ↓ export {selected.size} card{selected.size === 1 ? "" : "s"} to Anki
        </button>
      </div>
    </div>
  );
}

const btnSm: React.CSSProperties = {
  padding: "5px 12px", borderRadius: "7px", fontSize: "11px",
  fontFamily: "var(--font-dm-sans)", cursor: "pointer",
  border: "1px solid var(--border)", color: "var(--text-secondary)",
  background: "transparent", transition: "all 150ms",
};
