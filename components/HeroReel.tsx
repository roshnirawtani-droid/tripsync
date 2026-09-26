"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, Volume2, VolumeX } from "lucide-react";

const POSTER_SRC = "/manali-reel-poster.jpg";

// The glow only needs the reel's dominant colours, so a tiny canvas
// scaled up and blurred with CSS is enough - and it reuses the frames the
// visible <video> already decoded instead of playing a second copy.
const AMBIENT_WIDTH = 18;
const AMBIENT_HEIGHT = 32;
const AMBIENT_FRAME_MS = 80;

// Browsers only allow muted autoplay, so the reel starts silent and the
// sound button is the one explicit opt-in. Reduced-motion and Save-Data
// visitors get the poster and a play button instead of autoplay.
// "phone" wraps the reel in a device bezel: next to the hero copy, a
// portrait video reads as an app demo rather than as a narrow strip.
export default function HeroReel({ caption, frame = "card" }: { caption: string; frame?: "card" | "phone" }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ambientRef = useRef<HTMLCanvasElement>(null);
  const userPausedRef = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);

  useEffect(() => {
    const video = videoRef.current;
    const canvas = ambientRef.current;
    const ctx = canvas?.getContext("2d");
    if (!video || !canvas || !ctx) return;

    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    const autoplayAllowed =
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches && !connection?.saveData;

    const poster = new Image();
    poster.onload = () => ctx.drawImage(poster, 0, 0, AMBIENT_WIDTH, AMBIENT_HEIGHT);
    poster.src = POSTER_SRC;

    let frameId = 0;
    let lastDraw = 0;
    function drawAmbient(now: number) {
      if (now - lastDraw >= AMBIENT_FRAME_MS && video && ctx) {
        ctx.drawImage(video, 0, 0, AMBIENT_WIDTH, AMBIENT_HEIGHT);
        lastDraw = now;
      }
      frameId = requestAnimationFrame(drawAmbient);
    }

    function handlePlay() {
      setPlaying(true);
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(drawAmbient);
    }
    function handlePause() {
      setPlaying(false);
      cancelAnimationFrame(frameId);
    }
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    // Only play while the reel is actually on screen, and never restart
    // it after the visitor has paused it themselves.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && autoplayAllowed && !userPausedRef.current) {
          video.play().catch(() => setPlaying(false));
        } else if (!entry.isIntersecting) {
          video.pause();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(video);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frameId);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  function togglePlay() {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      userPausedRef.current = false;
      video.play().catch(() => setPlaying(false));
    } else {
      userPausedRef.current = true;
      video.pause();
    }
  }

  function toggleMute() {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setMuted(video.muted);
    if (!video.muted && video.paused) {
      userPausedRef.current = false;
      video.play().catch(() => setPlaying(false));
    }
  }

  const controlButton =
    "btn-glass-dark pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full transition active:scale-95";
  const isPhone = frame === "phone";

  return (
    <div className="relative isolate mx-auto w-fit">
      <canvas
        ref={ambientRef}
        width={AMBIENT_WIDTH}
        height={AMBIENT_HEIGHT}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[105%] w-[230%] -translate-x-1/2 -translate-y-1/2 opacity-55 blur-[80px] saturate-150"
      />

      <div
        className={
          isPhone
            ? "rounded-[2.9rem] bg-slate-950 p-2.5 shadow-2xl shadow-black/60 ring-1 ring-white/20"
            : "contents"
        }
      >
        <div
          className={`relative overflow-hidden bg-slate-900 ${
            isPhone ? "rounded-[2.3rem]" : "rounded-[28px] shadow-2xl shadow-black/50 ring-1 ring-white/20"
          }`}
          style={{
            width: isPhone
              ? "min(calc(100vw - 3.25rem), calc(min(70svh, 680px) * 9 / 16))"
              : "min(calc(100vw - 2rem), calc(min(66svh, 720px) * 9 / 16))",
            aspectRatio: "9 / 16",
          }}
        >
          {isPhone && (
            <span aria-hidden className="absolute left-1/2 top-2.5 z-10 h-6 w-24 -translate-x-1/2 rounded-full bg-slate-950" />
          )}
          <video
            ref={videoRef}
            className="h-full w-full object-cover"
            poster={POSTER_SRC}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={caption}
            onClick={togglePlay}
          >
            <source src="/manali-reel.webm" type="video/webm" />
            <source src="/manali-reel.mp4" type="video/mp4" />
          </video>

          <div
            className={`pointer-events-none absolute inset-x-0 top-0 flex justify-end gap-2 bg-gradient-to-b from-black/50 to-transparent p-3 ${
              isPhone ? "pt-11" : ""
            }`}
          >
            <button
              type="button"
              onClick={togglePlay}
              aria-label={playing ? "Pause video" : "Play video"}
              className={controlButton}
            >
              {playing ? <Pause size={18} /> : <Play size={18} className="translate-x-px" />}
            </button>
            <button
              type="button"
              onClick={toggleMute}
              aria-label={muted ? "Turn sound on" : "Turn sound off"}
              aria-pressed={!muted}
              className={controlButton}
            >
              {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
            </button>
          </div>

          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent px-5 pt-16 ${
              isPhone ? "pb-6" : "pb-12"
            }`}
          >
            <p className="font-display text-base font-bold text-white drop-shadow">{caption}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
