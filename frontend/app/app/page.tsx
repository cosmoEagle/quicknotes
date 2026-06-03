"use client";
import { useState, useRef, useCallback, useEffect } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import ProviderPanel from "@/components/ProviderPanel";
import SourceTabs, { SourceType } from "@/components/SourceTabs";
import NoteStylePicker, { NoteStyle, Proficiency } from "@/components/NoteStylePicker";
import { Card } from "@/components/FlashcardViewer";
import NotesOutput from "@/components/NotesOutput";
import ReviseChat, { ChatTurn } from "@/components/ReviseChat";
import GenerateButton, { GenerateState } from "@/components/GenerateButton";
import { useProviderConfig } from "@/hooks/useProviderConfig";
import { useAuth } from "@/hooks/useAuth";
import { generateNotes, reviseNotes } from "@/lib/api";
import { saveNote, extractTitle, type NoteRecord } from "@/lib/notes";
import NoteHistory from "@/components/NoteHistory";

type Mode = "centered" | "split";

/* ── Topbar ── */
function Topbar({ mode, onNew, userEmail, onSignOut, onHistory }: {
  mode: Mode; onNew: () => void;
  userEmail: string; onSignOut: () => void;
  onHistory: () => void;
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const initial = userEmail.charAt(0).toUpperCase();

  return (
    <header style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 20px",
      height: "52px",
      flexShrink: 0,
      borderBottom: "1px solid var(--border)",
      background: "rgba(9,9,9,0.88)",
      backdropFilter: "blur(14px)",
      WebkitBackdropFilter: "blur(14px)",
      position: "relative",
      zIndex: 20,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "9px", textDecoration: "none" }}>
          <div style={{
            width: "24px", height: "24px", borderRadius: "7px",
            background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 10px var(--accent-glow)", flexShrink: 0,
          }}>
            <span style={{ fontSize: "10px", fontWeight: 900, fontFamily: "var(--font-syne)", color: "#090909", lineHeight: 1 }}>Q</span>
          </div>
          <span style={{ fontFamily: "var(--font-syne)", fontWeight: 600, fontSize: "14px", color: "var(--text-secondary)", letterSpacing: "-0.01em" }}>
            QuickNotes
          </span>
        </Link>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {mode === "split" && (
          <button
            onClick={onNew}
            style={{
              padding: "5px 14px", borderRadius: "8px", fontSize: "12px",
              fontFamily: "var(--font-dm-sans)", cursor: "pointer",
              border: "1px solid var(--border)", color: "var(--text-secondary)",
              background: "transparent", transition: "all 150ms",
            }}
          >
            ← New
          </button>
        )}
        <ProviderPanel />

        {/* History button — visible styling */}
        <button
          onClick={onHistory}
          style={{
            padding: "5px 12px", borderRadius: "8px", fontSize: "11px",
            fontFamily: "var(--font-jetbrains)", cursor: "pointer",
            border: "1px solid var(--border)", color: "var(--text-secondary)",
            background: "rgba(255,255,255,0.03)", transition: "all 150ms",
          }}
        >
          ⟳ history
        </button>

        {/* User avatar — compact dropdown */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            style={{
              width: "30px", height: "30px", borderRadius: "50%",
              background: "var(--accent-faint)", border: "1px solid var(--accent-border-dim)",
              color: "var(--accent)", fontSize: "12px", fontWeight: 700,
              fontFamily: "var(--font-syne)", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "all 150ms",
            }}
          >
            {initial}
          </button>
          {userMenuOpen && (
            <>
              <div onClick={() => setUserMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 40 }} />
              <div style={{
                position: "absolute", right: 0, top: "calc(100% + 8px)", zIndex: 50,
                minWidth: "200px", padding: "8px",
                background: "rgba(13,13,13,0.97)", borderRadius: "12px",
                border: "1px solid var(--border)",
                boxShadow: "0 16px 40px rgba(0,0,0,0.6)",
              }}>
                <p style={{ fontSize: "11px", fontFamily: "var(--font-jetbrains)", color: "var(--text-muted)", padding: "6px 10px 10px", borderBottom: "1px solid var(--border)", marginBottom: "6px", wordBreak: "break-all" }}>
                  {userEmail}
                </p>
                <button
                  onClick={() => { setUserMenuOpen(false); onSignOut(); }}
                  style={{
                    width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "8px",
                    fontSize: "12px", fontFamily: "var(--font-dm-sans)", cursor: "pointer",
                    border: "none", color: "var(--text-secondary)", background: "transparent",
                    transition: "all 120ms",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.05)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}


/* ── Input form fields (shared between centered card and sidebar) ── */
function InputFields({
  sourceType, content, style, description, genState, canGenerate,
  proficiency, cardCount,
  onSourceTypeChange, onContentChange, onStyleChange, onDescriptionChange,
  onProficiencyChange, onCardCountChange,
  onGenerate, onCancel, hasKey,
}: {
  sourceType: SourceType; content: string; style: NoteStyle; description: string;
  genState: GenerateState; canGenerate: boolean;
  proficiency: Proficiency; cardCount: number;
  onSourceTypeChange: (t: SourceType) => void; onContentChange: (c: string) => void;
  onStyleChange: (s: NoteStyle) => void; onDescriptionChange: (d: string) => void;
  onProficiencyChange: (p: Proficiency) => void; onCardCountChange: (n: number) => void;
  onGenerate: () => void; onCancel: () => void; hasKey: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>

      {/* Source */}
      <div>
        <p className="section-label" style={{ marginBottom: "12px" }}>SOURCE</p>
        <SourceTabs
          sourceType={sourceType}
          content={content}
          onSourceTypeChange={onSourceTypeChange}
          onContentChange={onContentChange}
        />
      </div>

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--border)" }} />

      {/* Style */}
      <NoteStylePicker
        style={style}
        description={description}
        onStyleChange={onStyleChange}
        onDescriptionChange={onDescriptionChange}
        sourceType={sourceType}
        proficiency={proficiency}
        cardCount={cardCount}
        onProficiencyChange={onProficiencyChange}
        onCardCountChange={onCardCountChange}
      />

      {/* Divider */}
      <div style={{ height: "1px", background: "var(--border)" }} />

      {/* Generate */}
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <GenerateButton
          state={genState}
          disabled={!canGenerate}
          onClick={onGenerate}
          onCancel={onCancel}
        />
        {!hasKey && (
          <p style={{
            textAlign: "center",
            fontSize: "11px",
            fontFamily: "var(--font-jetbrains)",
            color: "var(--text-muted)",
          }}>
            set api key in top-right to continue
          </p>
        )}
      </div>
    </div>
  );
}

export default function AppPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const router = useRouter();
  const { config, loaded } = useProviderConfig();

  // Redirect to /auth if not logged in
  useEffect(() => {
    if (!authLoading && !user) router.replace("/auth");
  }, [user, authLoading, router]);
  const [mode, setMode] = useState<Mode>("centered");
  const [sourceType, setSourceType] = useState<SourceType>("youtube");
  const [content, setContent] = useState("");
  const [style, setStyle] = useState<NoteStyle>("summary");
  const [description, setDescription] = useState("");
  const [proficiency, setProficiency] = useState<Proficiency>("intermediate");
  const [cardCount, setCardCount] = useState(20);
  const [cards, setCards] = useState<Card[]>([]);
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("");
  const [genState, setGenState] = useState<GenerateState>("idle");
  const [isError, setIsError] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [historyOpen, setHistoryOpen]       = useState(false);
  const [historySaveTick, setHistorySaveTick] = useState(0); // increment after save to refresh list
  const [chatHistory, setChatHistory] = useState<ChatTurn[]>([]);
  const [isRevising, setIsRevising] = useState(false);
  const [reviseStatus, setReviseStatus] = useState("");
  const [chatCollapsed, setChatCollapsed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const reviseAbortRef = useRef<AbortController | null>(null);

  const canGenerate =
    loaded &&
    !!config.apiKey &&
    !!content.trim() &&
    genState !== "extracting" &&
    genState !== "generating";

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setMode("split");
    reviseAbortRef.current?.abort();
    abortRef.current = new AbortController();
    setNotes("");
    setCards([]);
    setIsError(false);
    setIsEditing(false);
    setChatHistory([]);
    setStatus("Starting…");
    setGenState("extracting");

    try {
      const stream = generateNotes(
        { source_type: sourceType, content: content.trim(), style, description,
          provider: config.provider, model: config.model, api_key: config.apiKey,
          proficiency, card_count: cardCount },
        abortRef.current.signal
      );

      for await (const msg of stream) {
        if (msg.event === "status") {
          setStatus(msg.data);
          if (msg.data.toLowerCase().includes("generating") || msg.data.toLowerCase().includes("building")) {
            setGenState("generating");
          }
        } else if (msg.event === "notes_start") {
          setGenState("generating");
          setStatus("Generating notes…");
        } else if (msg.event === "token") {
          flushSync(() => setNotes((p) => p + msg.data));
        } else if (msg.event === "card") {
          try {
            const parsed = JSON.parse(msg.data) as Card;
            flushSync(() => setCards((p) => [...p, parsed]));
          } catch { /* skip malformed card */ }
        } else if (msg.event === "error") {
          setIsError(true);
          setNotes(msg.data);
          setGenState("error");
          setStatus("");
          return;
        } else if (msg.event === "done") {
          setGenState("done");
          setStatus("");
          return;
        }
      }
      setGenState("done");
      setStatus("");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        setStatus("");
        setGenState("idle");
      } else {
        setIsError(true);
        setNotes(err instanceof Error ? err.message : "Unexpected error. Is the backend running on port 8000?");
        setGenState("error");
      }
    }
  }, [canGenerate, sourceType, content, style, description, proficiency, cardCount, config]);

  const handleCancel = () => {
    abortRef.current?.abort();
    setGenState("idle");
    setStatus("");
  };

  const handleNew = () => {
    abortRef.current?.abort();
    reviseAbortRef.current?.abort();
    setMode("centered");
    setNotes("");
    setCards([]);
    setGenState("idle");
    setStatus("");
    setIsError(false);
    setIsEditing(false);
    setChatHistory([]);
    setIsRevising(false);
  };

  // Auto-save after generation completes
  useEffect(() => {
    if (genState !== "done" || isError || (!notes && !cards.length)) return;
    const title = extractTitle(notes, cards.length ? cards : null, style, sourceType, content);
    saveNote({
      title,
      style,
      source_type: sourceType,
      source_url: sourceType !== "pdf" ? content.trim() : null,
      content: notes,
      cards: cards.length ? cards : null,
    })
      .then(() => setHistorySaveTick((t) => t + 1))
      .catch(() => { /* silently ignore save errors */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [genState]);

  // Load a note from history
  const handleLoadNote = (note: NoteRecord) => {
    abortRef.current?.abort();
    reviseAbortRef.current?.abort();
    setMode("split");
    setStyle(note.style as NoteStyle);
    setSourceType(note.source_type as SourceType);
    setContent(note.source_url ?? "");
    setNotes(note.content);
    setCards(note.cards ?? []);
    setGenState("done");
    setIsError(false);
    setIsEditing(false);
    setChatHistory([]);
    setIsRevising(false);
    setStatus("");
  };

  const handleToggleEdit = () => setIsEditing((v) => !v);

  const handleNotesChange = (s: string) => setNotes(s);

  const handleCardEdit = (index: number, field: "question" | "answer", value: string) => {
    setCards((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  };

  const handleRevise = useCallback(async (instruction: string) => {
    if (isRevising || !notes.trim()) return;
    reviseAbortRef.current = new AbortController();
    const signal = reviseAbortRef.current.signal;
    setChatHistory((prev) => [...prev, { role: "user", text: instruction }]);
    setIsRevising(true);
    setReviseStatus("Revising…");
    try {
      const stream = reviseNotes(
        {
          notes, instruction, history: chatHistory,
          source_type: sourceType, content: content.trim(),
          provider: config.provider, model: config.model, api_key: config.apiKey,
        },
        signal
      );
      for await (const msg of stream) {
        if (signal.aborted) return;
        if (msg.event === "status") {
          setReviseStatus(msg.data);
        } else if (msg.event === "summary") {
          setChatHistory((prev) => [...prev, { role: "assistant", text: msg.data }]);
        } else if (msg.event === "revised") {
          setNotes(msg.data);
        } else if (msg.event === "error") {
          setChatHistory((prev) => [...prev, { role: "assistant", text: `⚠ ${msg.data}` }]);
          setIsRevising(false);
          setReviseStatus("");
          return;
        } else if (msg.event === "done") {
          setIsRevising(false);
          setReviseStatus("");
          return;
        }
      }
      setIsRevising(false);
      setReviseStatus("");
    } catch (err: unknown) {
      if (err instanceof Error && err.name === "AbortError") {
        return;
      }
      setChatHistory((prev) => [...prev, { role: "assistant", text: `⚠ ${err instanceof Error ? err.message : "Revision failed."}` }]);
      setIsRevising(false);
      setReviseStatus("");
    }
  }, [isRevising, notes, chatHistory, sourceType, content, config]);

  const handleSourceTypeChange = (t: SourceType) => {
    setSourceType(t);
    if (t !== "youtube" && style === "timestamped") setStyle("summary");
  };

  const inputProps = {
    sourceType, content, style, description, genState, canGenerate,
    proficiency, cardCount,
    onSourceTypeChange: handleSourceTypeChange,
    onContentChange: setContent,
    onStyleChange: setStyle,
    onDescriptionChange: setDescription,
    onProficiencyChange: setProficiency,
    onCardCountChange: setCardCount,
    onGenerate: handleGenerate,
    onCancel: handleCancel,
    hasKey: loaded && !!config.apiKey,
  };

  // Show nothing while checking auth (avoids flash of app content)
  if (authLoading || !user) return null;

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", background: "var(--bg-base)" }}>
      <Topbar mode={mode} onNew={handleNew} userEmail={user.email ?? ""} onSignOut={signOut} onHistory={() => setHistoryOpen(true)} />
      <NoteHistory
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onLoad={handleLoadNote}
        refreshTrigger={historySaveTick}
      />

      {/* ── Scene container ── */}
      <div style={{ flex: 1, position: "relative", minHeight: 0 }}>

        {/* ── Scene A: Centered card ── */}
        <div
          aria-hidden={mode !== "centered"}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.035) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
            opacity: mode === "centered" ? 1 : 0,
            pointerEvents: mode === "centered" ? "all" : "none",
            transition: "opacity 450ms cubic-bezier(0.4,0,0.2,1), transform 450ms cubic-bezier(0.4,0,0.2,1)",
            transform: mode === "centered" ? "scale(1) translateY(0)" : "scale(0.96) translateY(-16px)",
          }}
        >
          {/* Ambient glow */}
          <div style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            background: "radial-gradient(ellipse 50% 40% at 50% 55%, rgba(16,217,160,0.05) 0%, transparent 65%)",
          }} />

          {/* Scrollable card wrapper */}
          <div style={{
            position: "relative",
            width: "100%",
            maxWidth: "460px",
            maxHeight: "calc(100vh - 72px)",
            overflowY: "auto",
            padding: "16px 20px 24px",
          }}>
            <div style={{
              borderRadius: "20px",
              background: "rgba(12,12,12,0.94)",
              border: "1px solid rgba(255,255,255,0.07)",
              backdropFilter: "blur(20px)",
              WebkitBackdropFilter: "blur(20px)",
              padding: "28px",
              boxShadow: "0 0 0 1px rgba(16,217,160,0.05), 0 2px 4px rgba(0,0,0,0.3), 0 16px 48px rgba(0,0,0,0.55), 0 0 80px rgba(16,217,160,0.03)",
            }}>
              {/* Card heading */}
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginBottom: "24px",
                paddingBottom: "20px",
                borderBottom: "1px solid var(--border)",
              }}>
                <div style={{
                  width: "3px",
                  height: "20px",
                  borderRadius: "2px",
                  background: "var(--accent)",
                  boxShadow: "0 0 10px var(--accent-glow)",
                  flexShrink: 0,
                }} />
                <span style={{
                  fontFamily: "var(--font-syne)",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "-0.02em",
                }}>
                  New note generation
                </span>
                <span className="section-label" style={{ marginLeft: "auto" }}>v1.0</span>
              </div>

              <InputFields {...inputProps} />
            </div>
          </div>
        </div>

        {/* ── Scene B: Split layout ── */}
        <div
          aria-hidden={mode !== "split"}
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            opacity: mode === "split" ? 1 : 0,
            pointerEvents: mode === "split" ? "all" : "none",
            transition: "opacity 450ms cubic-bezier(0.4,0,0.2,1), transform 450ms cubic-bezier(0.4,0,0.2,1)",
            transform: mode === "split" ? "translateY(0)" : "translateY(16px)",
          }}
        >
          {/* Left sidebar */}
          <div style={{
            width: "min(40%, 400px)",
            minWidth: "280px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            borderRight: "1px solid var(--border)",
            background: "rgba(9,9,9,0.65)",
          }}>
            <div style={{ padding: "24px 20px", flex: 1 }}>
              <InputFields {...inputProps} />
            </div>

          </div>

          {/* Right: output */}
          <div style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-base)",
            minHeight: 0,
            overflow: "hidden",
          }}>
            <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
              <NotesOutput
                notes={notes}
                status={status}
                isStreaming={genState === "extracting" || genState === "generating"}
                isError={isError}
                style={style}
                cards={cards}
                isEditing={isEditing}
                onToggleEdit={handleToggleEdit}
                onNotesChange={handleNotesChange}
                onCardEdit={handleCardEdit}
                sourceType={sourceType}
                videoUrl={content}
              />
            </div>
            {style !== "flashcard" && genState === "done" && !isError && (
              <ReviseChat
                history={chatHistory}
                isRevising={isRevising}
                status={reviseStatus}
                collapsed={chatCollapsed}
                onToggleCollapse={() => setChatCollapsed((v) => !v)}
                onSend={handleRevise}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
