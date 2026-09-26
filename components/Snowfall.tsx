"use client";

import { useEffect, useState } from "react";

const FLAKE_COUNT = 36;

interface Flake {
  left: number;
  size: number;
  delay: number;
  duration: number;
  drift: number;
}

// A short burst of snow as a "you did it" moment. Pure CSS animation on a
// few dozen dots - no library - and nothing at all for reduced-motion users.
// Only mounted in the browser after a submit, so the random layout and the
// matchMedia check are safe to compute on first render.
function makeFlakes(): Flake[] | null {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
  return Array.from({ length: FLAKE_COUNT }, () => ({
    left: Math.random() * 100,
    size: 4 + Math.random() * 6,
    delay: Math.random() * 0.8,
    duration: 2.2 + Math.random() * 1.4,
    drift: (Math.random() - 0.5) * 80,
  }));
}

export default function Snowfall({ onDone }: { onDone: () => void }) {
  const [flakes] = useState(makeFlakes);

  useEffect(() => {
    const timer = setTimeout(onDone, flakes ? 3800 : 0);
    return () => clearTimeout(timer);
  }, [onDone, flakes]);

  if (!flakes) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {flakes.map((f, i) => (
        <span
          key={i}
          className="absolute -top-4 rounded-full bg-white shadow-[0_0_6px_rgba(148,163,184,0.9)]"
          style={
            {
              left: `${f.left}%`,
              width: f.size,
              height: f.size,
              animation: `snow-fall ${f.duration}s ease-in ${f.delay}s forwards`,
              "--drift": `${f.drift}px`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
