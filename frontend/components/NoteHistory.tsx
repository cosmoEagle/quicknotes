"use client";
import { useEffect, useState, useCallback } from "react";
import { loadNotes, deleteNote, timeAgo, type NoteRecord } from "@/lib/notes";

const STYLE_COLORS: Record<string, string> = {
  summary:     "var(--accent)",
  "deep-dive": "#60a5fa",
  flashcard:   "#c084fc",
  timestamped: "#fbbf24",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onLoad: (note: NoteRecord) => void;
  refreshTrigger: number; // increment to force a reload
}

export default function NoteHistory({ open, onClose, onLoad, refreshTrigger }: Props) {
  const [notes, setNotes]   = useState<NoteRecord[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try { setNotes(await loadNotes()); }
    catch { /* ignore — user not authed yet */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { if (open) refresh(); }, [open, refresh, refreshTrigger]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await deleteNote(id);
    setNotes((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          onClick={onClose}
          style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
        />
      )}

      {/* Drawer */}
      <div style={{
        position: "fixed", top: 0, right: 0, bottom: 0,
        width: "340px", zIndex: 201,
        background: "rgba(11,11,11,0.97)",
        borderLeft: "1px solid var(--border)",
        display: "flex", flexDirection: "column",
        transform: open ? "translateX(0)" : "translateX(100%)",
        transition: "transform 300ms cubic-bezier(0.4,0,0.2,1)",
        boxShadow: open ? "-20px 0 60px rgba(0,0,0,0.6)" : "none",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
          <span className="section-label">NOTE HISTORY</span>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "20px", lineHeight: 1, padding: "2px 6px" }}
          >
            ×
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "10px 12px", display: "flex", flexDirection: "column", gap: "4px" }}>
          {loading && (
            <p style={{ textAlign: "center", fontSize: "11px", fontFamily: "var(--font-jetbrains)", color: "var(--text-muted)", padding: "24px 0" }}>
              loading…
            </p>
          )}
          {!loading && notes.length === 0 && (
            <div style={{ textAlign: "center", padding: "48px 20px", opacity: 0.5 }}>
              <p style={{ fontSize: "13px", fontFamily: "var(--font-syne)", color: "var(--text-muted)", marginBottom: "6px" }}>No notes yet</p>
              <p style={{ fontSize: "11px", fontFamily: "var(--font-jetbrains)", color: "var(--text-muted)" }}>Generated notes are saved here automatically.</p>
            </div>
          )}
          {notes.map((note) => (
            <div
              key={note.id}
              onClick={() => { onLoad(note); onClose(); }}
              style={{
                padding: "12px 14px", borderRadius: "10px", cursor: "pointer",
                border: "1px solid transparent", transition: "all 120ms",
                display: "flex", flexDirection: "column", gap: "6px",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.03)"; (e.currentTarget as HTMLDivElement).style.borderColor = "var(--border)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; (e.currentTarget as HTMLDivElement).style.borderColor = "transparent"; }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px" }}>
                <p style={{ fontSize: "12px", fontWeight: 500, color: "var(--text-primary)", fontFamily: "var(--font-dm-sans)", lineHeight: 1.4, flex: 1, margin: 0 }}>
                  {note.title || "Untitled note"}
                </p>
                <button
                  onClick={(e) => handleDelete(e, note.id)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: "14px", flexShrink: 0, padding: "0 2px", lineHeight: 1, transition: "color 120ms" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--error)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                >
                  ×
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{
                  fontSize: "9px", fontFamily: "var(--font-jetbrains)", padding: "2px 6px", borderRadius: "4px",
                  color: STYLE_COLORS[note.style] ?? "var(--text-muted)",
                  background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)",
                }}>
                  {note.style}
                </span>
                <span style={{ fontSize: "9px", fontFamily: "var(--font-jetbrains)", color: "var(--text-muted)" }}>
                  {note.source_type}
                </span>
                <span style={{ fontSize: "9px", fontFamily: "var(--font-jetbrains)", color: "var(--text-muted)", marginLeft: "auto" }}>
                  {timeAgo(note.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
