"use client";
import { useEffect, useRef } from "react";

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface Props {
  videoId: string;
  seekTo: number | null; // seconds; null = don't seek
}

export default function YouTubePlayer({ videoId, seekTo }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  // Mount the player once (or remount when videoId changes).
  useEffect(() => {
    if (!containerRef.current) return;

    const init = () => {
      if (!containerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        videoId,
        height: "192",
        width: "100%",
        playerVars: {
          autoplay: 0,
          modestbranding: 1,
          rel: 0,
          color: "white",
        },
      });
    };

    if (window.YT?.Player) {
      init();
    } else {
      // Inject the IFrame API script only once across all renders.
      if (!document.getElementById("yt-iframe-api")) {
        const s = document.createElement("script");
        s.id = "yt-iframe-api";
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      }
      // Chain onto any existing callback so we don't overwrite a previous one.
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        init();
      };
    }

    return () => {
      playerRef.current?.destroy?.();
      playerRef.current = null;
    };
  }, [videoId]);

  // Seek whenever the parent updates seekTo (e.g. user clicked a timestamp).
  useEffect(() => {
    if (seekTo !== null && playerRef.current?.seekTo) {
      playerRef.current.seekTo(seekTo, true);
      playerRef.current.playVideo();
    }
  }, [seekTo]);

  return (
    <div style={{
      borderRadius: "10px",
      overflow: "hidden",
      background: "#000",
      flexShrink: 0,
      marginBottom: "20px",
    }}>
      <div ref={containerRef} />
    </div>
  );
}
