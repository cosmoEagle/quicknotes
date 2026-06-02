"use client";

export type NoteStyle = "summary" | "deep-dive" | "flashcard" | "timestamped";

export type Proficiency = "beginner" | "intermediate" | "expert";

interface Props {
  style: NoteStyle;
  description: string;
  onStyleChange: (s: NoteStyle) => void;
  onDescriptionChange: (d: string) => void;
  sourceType: string;
  proficiency: Proficiency;
  cardCount: number;
  onProficiencyChange: (p: Proficiency) => void;
  onCardCountChange: (n: number) => void;
}

const STYLES: { id: NoteStyle; label: string; hint: string; icon: string }[] = [
  { id: "summary",     label: "Summary",      hint: "7–10 key bullet points",          icon: "≡" },
  { id: "deep-dive",   label: "Deep-dive",     hint: "Comprehensive structured notes",  icon: "⬡" },
  { id: "flashcard",   label: "Flashcards",    hint: "Study Q&A pairs",                 icon: "⧉" },
  { id: "timestamped", label: "Timestamped",   hint: "Notes by timestamp or chapter",   icon: "◷" },
];

export default function NoteStylePicker({
  style, description, onStyleChange, onDescriptionChange, sourceType,
  proficiency, cardCount, onProficiencyChange, onCardCountChange,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <p className="section-label" style={{ marginBottom: "12px" }}>NOTE STYLE</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {STYLES.map((s) => {
            const isTimestamped = s.id === "timestamped";
            const disabled = isTimestamped && sourceType !== "youtube";
            const active = style === s.id;
            return (
              <button
                key={s.id}
                onClick={() => !disabled && onStyleChange(s.id)}
                disabled={disabled}
                style={{
                  padding: "12px 14px",
                  textAlign: "left",
                  borderRadius: "10px",
                  cursor: disabled ? "not-allowed" : "pointer",
                  opacity: disabled ? 0.3 : 1,
                  border: active ? "1px solid var(--accent-border)" : "1px solid var(--border)",
                  background: active ? "var(--accent-faint)" : "rgba(255,255,255,0.01)",
                  transition: "all 150ms",
                  boxShadow: active ? `0 0 16px var(--accent-glow)` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                  <span style={{
                    fontSize: "14px",
                    color: active ? "var(--accent)" : "var(--text-muted)",
                    lineHeight: 1,
                  }}>
                    {s.icon}
                  </span>
                  <span style={{
                    fontSize: "12px",
                    fontWeight: 600,
                    fontFamily: "var(--font-dm-sans)",
                    color: active ? "var(--text-primary)" : "var(--text-secondary)",
                  }}>
                    {s.label}
                    {isTimestamped && sourceType !== "youtube" && (
                      <span style={{ marginLeft: "4px", fontSize: "9px", color: "var(--text-muted)" }}>
                        YT only
                      </span>
                    )}
                  </span>
                </div>
                <p style={{ fontSize: "10px", color: "var(--text-muted)", lineHeight: 1.5 }}>
                  {s.hint}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {style === "flashcard" && (
        <>
          <div>
            <p className="section-label" style={{ marginBottom: "10px" }}>PROFICIENCY</p>
            <div style={{ display: "flex", gap: "6px" }}>
              {(["beginner", "intermediate", "expert"] as Proficiency[]).map((p) => {
                const active = proficiency === p;
                return (
                  <button
                    key={p}
                    onClick={() => onProficiencyChange(p)}
                    style={{
                      flex: 1, padding: "7px 10px", borderRadius: "8px", fontSize: "11px",
                      textAlign: "center", cursor: "pointer", textTransform: "capitalize",
                      fontFamily: "var(--font-dm-sans)", fontWeight: active ? 600 : 400,
                      border: active ? "1px solid var(--accent-border)" : "1px solid var(--border)",
                      background: active ? "var(--accent-faint)" : "rgba(255,255,255,0.01)",
                      color: active ? "var(--accent)" : "var(--text-secondary)",
                      transition: "all 120ms",
                    }}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
              <p className="section-label" style={{ margin: 0 }}>CARD COUNT</p>
              <span style={{ fontFamily: "var(--font-jetbrains)", fontSize: "13px", fontWeight: 600, color: "var(--accent)" }}>
                ≈ {cardCount}
              </span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={1}
              value={cardCount}
              onChange={(e) => onCardCountChange(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--accent)", cursor: "pointer" }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "4px", fontSize: "10px", fontFamily: "var(--font-jetbrains)", color: "var(--text-muted)" }}>
              <span>5</span>
              <span>50</span>
            </div>
          </div>
        </>
      )}

      <div>
        <p className="section-label" style={{ marginBottom: "10px" }}>
          FOCUS <span style={{ opacity: 0.45, textTransform: "none", letterSpacing: "normal" }}>· optional</span>
        </p>
        <textarea
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="e.g. focus on technical concepts, skip the intro…"
          rows={2}
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: "10px",
            resize: "none",
            fontSize: "12px",
            fontFamily: "var(--font-dm-sans)",
            lineHeight: 1.6,
            background: "var(--bg-elevated)",
            border: "1px solid var(--border)",
            color: "var(--text-primary)",
            outline: "none",
          }}
        />
      </div>
    </div>
  );
}
