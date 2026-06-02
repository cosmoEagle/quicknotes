"use client";
import Link from "next/link";
import { useState, useEffect } from "react";

/* ── Typewriter demo ── */
const DEMO_LINES = [
  "## Summary",
  "",
  "- **Transformers** use self-attention to model long-range token dependencies.",
  "- **RLHF** aligns model outputs with human preferences via reward signals.",
  "- Scaling laws show predictable gains with compute, data, and parameters.",
  "- **Context length** is the current frontier for long-document reasoning.",
  "",
  "## Key Concepts",
  "",
  "- Emergent abilities appear at scale thresholds, not linearly.",
  "- Fine-tuning on small curated datasets beats raw scale for alignment.",
];

function TypewriterDemo() {
  const [displayed, setDisplayed] = useState<string[]>([]);
  const [lineIdx, setLineIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (done) return;
    if (lineIdx >= DEMO_LINES.length) { setDone(true); return; }
    const line = DEMO_LINES[lineIdx];
    if (charIdx < line.length) {
      const t = setTimeout(() => {
        setDisplayed((prev) => {
          const next = [...prev];
          if (next.length <= lineIdx) next.push("");
          next[lineIdx] = line.slice(0, charIdx + 1);
          return next;
        });
        setCharIdx((c) => c + 1);
      }, 16);
      return () => clearTimeout(t);
    } else {
      const t = setTimeout(() => { setLineIdx((l) => l + 1); setCharIdx(0); }, 35);
      return () => clearTimeout(t);
    }
  }, [lineIdx, charIdx, done]);

  return (
    <div style={{
      borderRadius: "16px",
      overflow: "hidden",
      background: "#0c0c0c",
      border: "1px solid rgba(255,255,255,0.07)",
      boxShadow: "0 32px 64px rgba(0,0,0,0.55), 0 0 0 1px rgba(16,217,160,0.04)",
    }}>
      {/* Window chrome */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "12px 16px",
        borderBottom: "1px solid rgba(255,255,255,0.05)",
      }}>
        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FF5F57", display: "inline-block" }} />
        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#FFBD2E", display: "inline-block" }} />
        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#28C840", display: "inline-block" }} />
        <span style={{ marginLeft: "8px", fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-jetbrains)" }}>
          notes.md
        </span>
        <span style={{
          marginLeft: "auto",
          fontSize: "10px",
          padding: "2px 8px",
          borderRadius: "4px",
          background: "var(--accent-faint)",
          color: "var(--accent)",
          fontFamily: "var(--font-jetbrains)",
          border: "1px solid var(--accent-border-dim)",
        }}>
          live
        </span>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 20px 24px", minHeight: "260px" }}>
        {displayed.map((line, i) => {
          const isH2 = line.startsWith("## ");
          const isBold = line.includes("**");
          return (
            <div
              key={i}
              style={{
                fontFamily: "var(--font-jetbrains), monospace",
                fontSize: "12px",
                lineHeight: "1.85",
                color: isH2 ? "var(--accent)" : "var(--text-primary)",
                fontWeight: isH2 ? 600 : 400,
                marginTop: isH2 && i > 0 ? "12px" : 0,
                opacity: line === "" ? 0 : 1,
              }}
            >
              {line || " "}
            </div>
          );
        })}
        {!done && (
          <span className="cursor-blink" style={{
            display: "inline-block",
            width: "8px",
            height: "14px",
            background: "var(--accent)",
            verticalAlign: "text-bottom",
            borderRadius: "1px",
          }} />
        )}
      </div>
    </div>
  );
}

/* ── Features ── */
const FEATURES = [
  {
    num: "01",
    title: "4 Note Styles",
    desc: "Summary bullet points, deep-dive prose, flashcard Q&A, or timestamped chapters.",
  },
  {
    num: "02",
    title: "LangGraph Pipeline",
    desc: "Hybrid workflow graph with a ReAct agent node — not a simple prompt wrapper.",
  },
  {
    num: "03",
    title: "Your LLM, Your Key",
    desc: "Gemini, OpenAI, Anthropic, or Groq. Nothing stored server-side.",
  },
  {
    num: "04",
    title: "Export as .md",
    desc: "Download clean Markdown. Drop into Obsidian, Notion, or any notes app.",
  },
];

/* ── Marquee items ── */
const MARQUEE_ITEMS = [
  "YouTube", "PDF", "Articles", "Gemini", "OpenAI", "Anthropic", "Groq",
  "LangGraph", "Streaming", "Obsidian", "Notion", "Markdown",
  "YouTube", "PDF", "Articles", "Gemini", "OpenAI", "Anthropic", "Groq",
  "LangGraph", "Streaming", "Obsidian", "Notion", "Markdown",
];

export default function LandingPage() {
  return (
    <div style={{ background: "var(--bg-base)", minHeight: "100vh", color: "var(--text-primary)" }}>

      {/* ── Nav ── */}
      <header style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        borderBottom: "1px solid var(--border)",
        background: "rgba(9,9,9,0.82)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: "56px",
          }}>
            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{
                width: "28px",
                height: "28px",
                borderRadius: "8px",
                background: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 14px var(--accent-glow)",
                flexShrink: 0,
              }}>
                <span style={{
                  fontSize: "12px",
                  fontWeight: 900,
                  fontFamily: "var(--font-syne)",
                  color: "#090909",
                  lineHeight: 1,
                }}>Q</span>
              </div>
              <span style={{
                fontFamily: "var(--font-syne)",
                fontWeight: 700,
                fontSize: "15px",
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}>
                QuickNotes
              </span>
            </div>

            {/* Nav links */}
            <nav style={{ display: "flex", alignItems: "center", gap: "28px" }}>
              <a
                href="#features"
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  fontFamily: "var(--font-dm-sans)",
                  transition: "color 150ms",
                }}
              >
                Features
              </a>
              <a
                href="#pipeline"
                style={{
                  fontSize: "13px",
                  color: "var(--text-secondary)",
                  textDecoration: "none",
                  fontFamily: "var(--font-dm-sans)",
                }}
              >
                Pipeline
              </a>
              <Link
                href="/app"
                style={{
                  padding: "7px 18px",
                  borderRadius: "8px",
                  fontSize: "13px",
                  fontWeight: 600,
                  fontFamily: "var(--font-dm-sans)",
                  textDecoration: "none",
                  background: "var(--accent)",
                  color: "#090909",
                  boxShadow: "0 0 18px var(--accent-glow)",
                  transition: "opacity 150ms",
                }}
              >
                Open App →
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section style={{ padding: "88px 0 72px" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
          <div className="hero-grid">
            {/* Left: copy */}
            <div className="slide-up">
              {/* Tag pill */}
              <div style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "999px",
                marginBottom: "28px",
                background: "var(--accent-faint)",
                border: "1px solid var(--accent-border-dim)",
                fontSize: "11px",
                fontFamily: "var(--font-jetbrains)",
                color: "var(--accent)",
              }}>
                <span style={{ width: "5px", height: "5px", borderRadius: "50%", background: "var(--accent)", display: "inline-block" }} />
                LangGraph · Multi-LLM · Live streaming
              </div>

              <h1 style={{
                fontFamily: "var(--font-syne)",
                fontSize: "clamp(2.4rem, 4.5vw, 3.6rem)",
                fontWeight: 800,
                lineHeight: 1.08,
                letterSpacing: "-0.03em",
                marginBottom: "24px",
                color: "var(--text-primary)",
              }}>
                Turn any content<br />
                into <span className="shimmer-text">structured</span><br />
                knowledge.
              </h1>

              <p style={{
                fontSize: "16px",
                lineHeight: 1.7,
                color: "var(--text-secondary)",
                maxWidth: "440px",
                marginBottom: "36px",
                fontFamily: "var(--font-dm-sans)",
              }}>
                Paste a YouTube link, upload a PDF, or share an article URL.
                Choose your note style, pick your LLM — get clean Markdown notes streamed live.
              </p>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "36px" }}>
                <Link
                  href="/app"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 24px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily: "var(--font-dm-sans)",
                    textDecoration: "none",
                    background: "var(--accent)",
                    color: "#090909",
                    boxShadow: "0 4px 28px var(--accent-glow-lg)",
                    transition: "opacity 150ms",
                  }}
                >
                  Start generating notes →
                </Link>
                <a
                  href="#pipeline"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 20px",
                    borderRadius: "10px",
                    fontSize: "14px",
                    fontFamily: "var(--font-dm-sans)",
                    textDecoration: "none",
                    border: "1px solid var(--border)",
                    color: "var(--text-secondary)",
                    background: "rgba(255,255,255,0.02)",
                  }}
                >
                  How it works ↓
                </a>
              </div>

              {/* Source + style pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {["▶ YouTube", "⬜ PDF", "⊞ Articles"].map((s) => (
                  <span key={s} className="pill">{s}</span>
                ))}
                <span className="pill" style={{ color: "var(--accent)", borderColor: "var(--accent-border-dim)", background: "var(--accent-faint)" }}>
                  4 note styles
                </span>
                <span className="pill">free API keys accepted</span>
              </div>
            </div>

            {/* Right: demo */}
            <div className="slide-up delay-2 float">
              <TypewriterDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ── Marquee ── */}
      <div style={{
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
        padding: "13px 0",
        overflow: "hidden",
        position: "relative",
      }}>
        {/* fade edges */}
        <div style={{
          position: "absolute", left: 0, top: 0, bottom: 0, width: "80px",
          background: "linear-gradient(90deg, var(--bg-base) 0%, transparent 100%)",
          zIndex: 2, pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", right: 0, top: 0, bottom: 0, width: "80px",
          background: "linear-gradient(270deg, var(--bg-base) 0%, transparent 100%)",
          zIndex: 2, pointerEvents: "none",
        }} />
        <div className="marquee-inner" style={{ display: "flex", width: "max-content", gap: "0" }}>
          {MARQUEE_ITEMS.map((item, i) => (
            <span
              key={i}
              style={{
                fontSize: "11px",
                fontFamily: "var(--font-jetbrains)",
                color: i % 3 === 0 ? "var(--accent)" : "var(--text-muted)",
                padding: "0 20px",
                whiteSpace: "nowrap",
              }}
            >
              {item}
              <span style={{ marginLeft: "20px", color: "var(--border)" }}>·</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" style={{ padding: "80px 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>

          {/* Section divider label */}
          <div className="divider-label" style={{ marginBottom: "48px" }}>
            <span className="section-label">CAPABILITIES</span>
          </div>

          <div className="feature-grid">
            {FEATURES.map((f) => (
              <div
                key={f.num}
                className="card-hover"
                style={{
                  padding: "24px",
                  borderRadius: "14px",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border)",
                }}
              >
                <div style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "11px",
                  color: "var(--accent)",
                  marginBottom: "14px",
                  letterSpacing: "0.05em",
                }}>
                  {f.num}
                </div>
                <h3 style={{
                  fontFamily: "var(--font-syne)",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                  letterSpacing: "-0.01em",
                }}>
                  {f.title}
                </h3>
                <p style={{
                  fontSize: "13px",
                  lineHeight: 1.65,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-dm-sans)",
                }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pipeline ── */}
      <section id="pipeline" style={{
        padding: "80px 0",
        background: "var(--bg-surface)",
        borderTop: "1px solid var(--border)",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>

          <div className="divider-label" style={{ marginBottom: "52px" }}>
            <span className="section-label">HOW IT WORKS</span>
          </div>

          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "32px",
          }}>
            {[
              { step: "01", title: "Provide a source", desc: "YouTube URL, PDF upload, or any article link. The pipeline handles extraction." },
              { step: "02", title: "Pick a style",     desc: "Summary, deep-dive, flashcard Q&A, or timestamped notes — matched to your content." },
              { step: "03", title: "LangGraph runs",   desc: "Content is extracted, chunked if needed, then a ReAct agent drafts your notes." },
              { step: "04", title: "Stream & export",  desc: "Watch notes appear token by token. Download as .md in one click." },
            ].map((s, i) => (
              <div key={s.step} style={{ position: "relative" }}>
                {i < 3 && (
                  <div style={{
                    position: "absolute",
                    top: "9px",
                    left: "calc(100% + 16px)",
                    width: "calc(100% - 32px)",
                    height: "1px",
                    background: "linear-gradient(90deg, var(--border) 0%, transparent 100%)",
                    display: "none", // handled by desktop media query below
                  }} className="step-connector" />
                )}
                <div style={{
                  fontFamily: "var(--font-jetbrains)",
                  fontSize: "11px",
                  color: "var(--accent)",
                  marginBottom: "14px",
                }}>
                  {s.step}
                </div>
                <h3 style={{
                  fontFamily: "var(--font-syne)",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  marginBottom: "8px",
                  letterSpacing: "-0.01em",
                }}>
                  {s.title}
                </h3>
                <p style={{
                  fontSize: "12.5px",
                  lineHeight: 1.65,
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-dm-sans)",
                }}>
                  {s.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "88px 0" }}>
        <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "0 24px" }}>
          <div style={{
            padding: "56px 48px",
            borderRadius: "20px",
            background: `radial-gradient(ellipse 60% 70% at 50% 100%, var(--accent-glow) 0%, transparent 70%), var(--bg-surface)`,
            border: "1px solid var(--accent-border-dim)",
            textAlign: "center",
            boxShadow: "0 0 80px rgba(16,217,160,0.04)",
          }}>
            <p className="section-label" style={{ marginBottom: "20px" }}>GET STARTED</p>
            <h2 style={{
              fontFamily: "var(--font-syne)",
              fontSize: "clamp(1.8rem, 3vw, 2.6rem)",
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: "var(--text-primary)",
              marginBottom: "16px",
            }}>
              Ready to take better notes?
            </h2>
            <p style={{
              fontSize: "15px",
              color: "var(--text-secondary)",
              fontFamily: "var(--font-dm-sans)",
              maxWidth: "400px",
              margin: "0 auto 36px",
              lineHeight: 1.6,
            }}>
              Bring your free Gemini key and start generating structured notes in under a minute.
            </p>
            <Link
              href="/app"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                padding: "14px 32px",
                borderRadius: "10px",
                fontSize: "14px",
                fontWeight: 700,
                fontFamily: "var(--font-dm-sans)",
                textDecoration: "none",
                background: "var(--accent)",
                color: "#090909",
                boxShadow: "0 4px 32px var(--accent-glow)",
                letterSpacing: "-0.01em",
              }}
            >
              Open QuickNotes →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid var(--border)",
        padding: "24px 0",
      }}>
        <div style={{
          maxWidth: "1100px",
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{
              width: "20px", height: "20px", borderRadius: "6px",
              background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <span style={{ fontSize: "9px", fontWeight: 900, fontFamily: "var(--font-syne)", color: "#090909" }}>Q</span>
            </div>
            <span style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-dm-sans)" }}>
              QuickNotes
            </span>
          </div>
          <p style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-jetbrains)" }}>
            LangGraph · LangChain · Next.js · FastAPI
          </p>
        </div>
      </footer>
    </div>
  );
}
