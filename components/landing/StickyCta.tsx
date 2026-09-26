"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

// Phones only: once the hero (and its CTA) scrolls away, keep one tap
// between the visitor and starting a trip.
export default function StickyCta({ targetId, onClick }: { targetId: string; onClick: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting), {
      threshold: 0.05,
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/90 p-3 backdrop-blur-md transition-transform duration-300 sm:hidden ${
        visible ? "translate-y-0" : "translate-y-full"
      }`}
      aria-hidden={!visible}
    >
      <button
        onClick={onClick}
        tabIndex={visible ? 0 : -1}
        className="btn-glacier flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-base font-bold transition active:scale-[0.98]"
      >
        Start planning your trip <ArrowRight size={18} />
      </button>
    </div>
  );
}
