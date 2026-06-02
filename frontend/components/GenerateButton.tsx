"use client";

export type GenerateState = "idle" | "extracting" | "generating" | "done" | "error";

interface Props {
  state: GenerateState;
  disabled?: boolean;
  onClick: () => void;
  onCancel?: () => void;
}

const LABELS: Record<GenerateState, string> = {
  idle:       "Generate Notes  →",
  extracting: "Extracting content…",
  generating: "Generating notes…",
  done:       "Done — Generate again  →",
  error:      "Try again  →",
};

export default function GenerateButton({ state, disabled, onClick, onCancel }: Props) {
  const isRunning = state === "extracting" || state === "generating";
  const isActive  = state === "idle" || state === "done" || state === "error";
  const isDisabled = disabled && !isRunning;

  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <button
        onClick={onClick}
        disabled={!!isDisabled || isRunning}
        style={{
          flex: 1,
          padding: "12px 20px",
          borderRadius: "10px",
          fontSize: "13px",
          fontWeight: 600,
          fontFamily: "var(--font-dm-sans)",
          cursor: isDisabled ? "not-allowed" : isRunning ? "default" : "pointer",
          transition: "all 200ms",
          ...(isDisabled
            ? {
                background: "var(--accent-xfaint)",
                color: "rgba(16,217,160,0.22)",
                border: "1px solid rgba(16,217,160,0.08)",
                boxShadow: "none",
              }
            : isRunning
            ? {
                background: "var(--accent-faint)",
                color: "var(--accent)",
                border: "1px solid var(--accent-border-dim)",
                boxShadow: "none",
              }
            : {
                background: "var(--accent)",
                color: "#090909",
                border: "1px solid var(--accent)",
                boxShadow: `0 4px 24px var(--accent-glow)`,
              }),
        }}
      >
        {isRunning ? (
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
            <span
              style={{
                display: "inline-block",
                width: "10px",
                height: "10px",
                borderRadius: "50%",
                border: "2px solid currentColor",
                borderTopColor: "transparent",
                animation: "spin 0.7s linear infinite",
              }}
            />
            {LABELS[state]}
          </span>
        ) : (
          LABELS[state]
        )}
      </button>

      {isRunning && onCancel && (
        <button
          onClick={onCancel}
          style={{
            padding: "0 14px",
            borderRadius: "10px",
            fontSize: "11px",
            fontFamily: "var(--font-dm-sans)",
            cursor: "pointer",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            background: "transparent",
            transition: "all 100ms",
          }}
        >
          cancel
        </button>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
