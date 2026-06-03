"use client";
import { useEffect, useRef, useState } from "react";

declare global {
  interface Window { YT: any; onYouTubeIframeAPIReady: () => void; }
}

// seekTo includes a monotonic id so clicking the same timestamp twice
// still produces a new value and triggers the useEffect.
export interface SeekRequest { secs: number; id: number; }

interface Props {
  videoId: string;
  seekTo: SeekRequest | null;
  onClose: () => void;
}

const MIN_W = 280;
const MIN_H = 200;
const HEADER_H = 36;

export default function FloatingYouTubePlayer({ videoId, seekTo, onClose }: Props) {
  const containerRef  = useRef<HTMLDivElement>(null);
  const playerRef     = useRef<any>(null);
  const pendingSeek   = useRef<number | null>(null); // seek requested before player was ready

  // Position & size (initialised client-side to avoid SSR mismatch)
  const [pos,  setPos]  = useState({ x: 60, y: 80 });
  const [size, setSize] = useState({ w: 380, h: 250 });
  const [active, setActive] = useState(false); // dragging or resizing

  // Single ref tracks the current drag/resize gesture so listeners stay stable.
  const gesture = useRef({
    type: "none" as "drag" | "resize" | "none",
    startX: 0, startY: 0,
    startPosX: 0, startPosY: 0,
    startW: 0, startH: 0,
  });

  // Position popup in top-right of viewport on first mount
  useEffect(() => {
    setPos({ x: Math.max(40, window.innerWidth - 440), y: 80 });
  }, []);

  // Global mouse handlers (registered once)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const g = gesture.current;
      if (g.type === "drag") {
        setPos({
          x: Math.max(0, g.startPosX + e.clientX - g.startX),
          y: Math.max(0, g.startPosY + e.clientY - g.startY),
        });
      } else if (g.type === "resize") {
        setSize({
          w: Math.max(MIN_W, g.startW + e.clientX - g.startX),
          h: Math.max(MIN_H, g.startH + e.clientY - g.startY),
        });
      }
    };
    const onUp = () => {
      gesture.current.type = "none";
      setActive(false);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, []);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    gesture.current = { type: "drag", startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y, startW: size.w, startH: size.h };
    setActive(true);
  };

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    gesture.current = { type: "resize", startX: e.clientX, startY: e.clientY, startPosX: pos.x, startPosY: pos.y, startW: size.w, startH: size.h };
    setActive(true);
  };

  // Mount the YT IFrame player
  useEffect(() => {
    if (!containerRef.current) return;
    const init = () => {
      if (!containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId, height: "100%", width: "100%",
        playerVars: { autoplay: 0, modestbranding: 1, rel: 0, color: "white" },
        events: {
          onReady: (event: any) => {
            // Re-assign to event.target — the fully-ready player with all API methods.
            // new YT.Player() returns a placeholder; seekTo/playVideo only exist on event.target.
            playerRef.current = event.target;
            if (pendingSeek.current !== null) {
              event.target.seekTo(pendingSeek.current, true);
              event.target.playVideo();
              pendingSeek.current = null;
            }
          },
        },
      });
    };
    if (window.YT?.Player) {
      init();
    } else {
      if (!document.getElementById("yt-iframe-api")) {
        const s = document.createElement("script");
        s.id = "yt-iframe-api";
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      }
      window.onYouTubeIframeAPIReady = init;
    }
    return () => {
      playerRef.current?.destroy?.();
      playerRef.current = null;
      // Clear stale init callback to prevent it firing on a now-unmounted component
      if (window.onYouTubeIframeAPIReady === init) {
        window.onYouTubeIframeAPIReady = () => {};
      }
    };
  }, [videoId]);

  // Seek when requested. seekTo.id increments on every click (even same timestamp)
  // so this effect always fires. If the player isn't ready yet, store as pending.
  useEffect(() => {
    if (seekTo === null) return;
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(seekTo.secs, true);
      playerRef.current.playVideo();
    } else {
      pendingSeek.current = seekTo.secs;
    }
  }, [seekTo]);

  const playerH = size.h - HEADER_H;

  return (
    <div style={{
      position: "fixed",
      left: pos.x,
      top: pos.y,
      width: size.w,
      zIndex: 1000,
      borderRadius: "12px",
      overflow: "hidden",
      boxShadow: "0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.08)",
      background: "#000",
      userSelect: "none",
    }}>

      {/* Drag handle — header bar */}
      <div
        onMouseDown={startDrag}
        style={{
          height: HEADER_H,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 12px",
          background: "rgba(15,15,15,0.97)",
          borderBottom: "1px solid rgba(255,255,255,0.07)",
          cursor: "grab",
          flexShrink: 0,
        }}
      >
        <span style={{
          fontSize: "11px",
          fontFamily: "var(--font-jetbrains, monospace)",
          color: "rgba(255,255,255,0.4)",
          letterSpacing: "0.06em",
        }}>
          ⠿ VIDEO
        </span>
        <button
          onMouseDown={(e) => e.stopPropagation()}
          onClick={onClose}
          style={{
            background: "none", border: "none", cursor: "pointer",
            color: "rgba(255,255,255,0.4)", fontSize: "16px", lineHeight: 1,
            padding: "2px 4px", borderRadius: "4px",
            transition: "color 120ms",
          }}
        >
          ×
        </button>
      </div>

      {/* Player area */}
      <div style={{ position: "relative", height: playerH }}>
        {/* Always-mounted overlay — only intercepts mouse events while dragging/resizing.
            Must NOT be conditionally rendered: the YT IFrame API replaces containerRef
            with an <iframe> outside React, so conditional siblings cause insertBefore errors. */}
        <div style={{
          position: "absolute", inset: 0, zIndex: 2,
          pointerEvents: active ? "all" : "none",
        }} />
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      </div>

      {/* Resize handle — bottom-right corner */}
      <div
        onMouseDown={startResize}
        style={{
          position: "absolute", bottom: 0, right: 0,
          width: 18, height: 18,
          cursor: "nwse-resize",
          display: "flex", alignItems: "flex-end", justifyContent: "flex-end",
          padding: "3px",
          zIndex: 10,
        }}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M9 1L1 9M9 5L5 9M9 9H9" stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </div>
    </div>
  );
}
