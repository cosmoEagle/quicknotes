"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function AuthPage() {
  const { user, loading, signIn, signUp } = useAuth();
  const router = useRouter();

  const [mode, setMode]         = useState<"signin" | "signup">("signin");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [message, setMessage]   = useState("");
  const [busy, setBusy]         = useState(false);

  // Already logged in → go straight to the app
  useEffect(() => {
    if (!loading && user) router.replace("/app");
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setBusy(true);

    const err = mode === "signin"
      ? await signIn(email, password)
      : await signUp(email, password);

    if (err) {
      setError(err.message);
    } else if (mode === "signup") {
      setMessage("Check your email to confirm your account, then sign in.");
      setMode("signin");
    }
    // on successful sign-in the useEffect above handles redirect
    setBusy(false);
  };

  if (loading) return null;

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-base)",
      backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.03) 1px, transparent 1px)",
      backgroundSize: "28px 28px",
    }}>
      {/* Ambient glow */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(16,217,160,0.05) 0%, transparent 65%)",
      }} />

      <div style={{ width: "100%", maxWidth: "400px", padding: "24px 20px", position: "relative" }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", justifyContent: "center", marginBottom: "32px" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: "9px", textDecoration: "none" }}>
            <div style={{
              width: "28px", height: "28px", borderRadius: "8px",
              background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 14px var(--accent-glow)",
            }}>
              <span style={{ fontSize: "12px", fontWeight: 900, fontFamily: "var(--font-syne)", color: "#090909", lineHeight: 1 }}>Q</span>
            </div>
            <span style={{ fontFamily: "var(--font-syne)", fontWeight: 700, fontSize: "16px", color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              QuickNotes
            </span>
          </Link>
        </div>

        {/* Card */}
        <div style={{
          borderRadius: "20px",
          background: "rgba(12,12,12,0.94)",
          border: "1px solid rgba(255,255,255,0.07)",
          backdropFilter: "blur(20px)",
          padding: "32px 28px",
          boxShadow: "0 0 0 1px rgba(16,217,160,0.04), 0 16px 48px rgba(0,0,0,0.55)",
        }}>
          {/* Mode toggle */}
          <div style={{ display: "flex", gap: "4px", padding: "4px", background: "var(--bg-elevated)", borderRadius: "10px", marginBottom: "28px" }}>
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setMessage(""); }}
                style={{
                  flex: 1, padding: "8px", borderRadius: "8px", fontSize: "12px", fontWeight: 600,
                  fontFamily: "var(--font-dm-sans)", cursor: "pointer", border: "none",
                  background: mode === m ? "rgba(255,255,255,0.06)" : "transparent",
                  color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
                  transition: "all 150ms",
                }}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontFamily: "var(--font-jetbrains)", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                EMAIL
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                style={{
                  padding: "10px 14px", borderRadius: "10px", fontSize: "13px",
                  fontFamily: "var(--font-dm-sans)", background: "var(--bg-elevated)",
                  border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none",
                }}
              />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <label style={{ fontSize: "11px", fontFamily: "var(--font-jetbrains)", color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                PASSWORD
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={6}
                style={{
                  padding: "10px 14px", borderRadius: "10px", fontSize: "13px",
                  fontFamily: "var(--font-dm-sans)", background: "var(--bg-elevated)",
                  border: "1px solid var(--border)", color: "var(--text-primary)", outline: "none",
                }}
              />
            </div>

            {error && (
              <p style={{ fontSize: "12px", color: "var(--error)", fontFamily: "var(--font-jetbrains)", lineHeight: 1.5 }}>
                {error}
              </p>
            )}
            {message && (
              <p style={{ fontSize: "12px", color: "var(--accent)", fontFamily: "var(--font-jetbrains)", lineHeight: 1.5 }}>
                {message}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              style={{
                marginTop: "4px", padding: "12px", borderRadius: "10px", fontSize: "13px",
                fontWeight: 600, fontFamily: "var(--font-dm-sans)", cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.6 : 1,
                border: "1px solid var(--accent-border)", color: busy ? "var(--text-muted)" : "var(--accent)",
                background: "var(--accent-faint)", boxShadow: "0 0 14px var(--accent-glow)",
                transition: "all 150ms",
              }}
            >
              {busy ? "Please wait…" : mode === "signin" ? "→ Sign in" : "→ Create account"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
