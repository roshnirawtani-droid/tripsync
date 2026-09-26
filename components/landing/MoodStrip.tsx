import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { VIBE_PHOTOS } from "@/lib/backgrounds";
import { DestinationType } from "@/lib/types";

const MOODS: { vibe: DestinationType; title: string; tagline: string }[] = [
  { vibe: "mountains", title: "Snow days", tagline: "Maggi, bonfires, frozen fingers" },
  { vibe: "adventure", title: "Adrenaline", tagline: "Paragliding over Solang" },
  { vibe: "nature", title: "River camps", tagline: "Riverside tents, zero network" },
  { vibe: "spiritual", title: "Slow & soulful", tagline: "Temples, cedar forests, prayer flags" },
];

// Picking a mood starts the planner with that vibe already chosen - a
// low-effort first tap that turns browsing into a trip.
export default function MoodStrip({ onPick }: { onPick: (vibe: DestinationType) => void }) {
  return (
    <section className="bg-slate-950 py-20 text-white">
      <div className="mx-auto max-w-5xl px-4">
        <p className="text-xs font-bold uppercase tracking-widest text-brand-300">What&apos;s the vibe?</p>
        <h2 className="mt-2 font-display text-3xl font-bold md:text-4xl">Pick a mood. We&apos;ll plan the rest.</h2>
      </div>
      <ul className="mx-auto mt-10 flex max-w-5xl snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-4 md:grid md:grid-cols-4 md:overflow-visible">
        {MOODS.map((m) => {
          const photo = VIBE_PHOTOS[m.vibe];
          return (
            <li key={m.vibe} className="w-[72%] shrink-0 snap-center sm:w-[45%] md:w-auto">
              <button
                onClick={() => onPick(m.vibe)}
                className="group relative block aspect-[3/4] w-full overflow-hidden rounded-3xl text-left ring-1 ring-white/10 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand-400"
              >
                <Image
                  src={photo.src}
                  alt={photo.alt}
                  fill
                  sizes="(min-width: 768px) 240px, 72vw"
                  className="object-cover transition duration-700 group-hover:scale-110"
                  style={{ objectPosition: photo.position }}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                <span className="absolute inset-x-0 bottom-0 p-4">
                  <span className="block font-display text-2xl font-bold">{m.title}</span>
                  <span className="mt-0.5 block text-sm text-white/80">{m.tagline}</span>
                  <span className="mt-3 inline-flex items-center gap-1 text-sm font-bold text-brand-300 transition group-hover:gap-2">
                    Plan this <ArrowRight size={15} />
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
