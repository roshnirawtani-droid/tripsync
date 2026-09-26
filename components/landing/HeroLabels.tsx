import { CalendarCheck, Check, IndianRupee, MountainSnow } from "lucide-react";

// Three quiet glass tags around the hero phone that restate the promise
// under the headline - dates, budget, vibe - each already ticked off.
// Decorative repetition of the copy, so hidden from screen readers.
// Wide screens only (there is no room beside the phone below 1280px).
const LABELS = [
  { icon: CalendarCheck, text: "Dates that work for all", position: "-right-36 top-40 2xl:-right-52", delay: "0.3s" },
  { icon: IndianRupee, text: "Budget fits everyone", position: "-left-48 top-[68%]", delay: "0.6s" },
  { icon: MountainSnow, text: "Vibe: Mountains", position: "-right-28 bottom-24 2xl:-right-44", delay: "0.9s" },
];

export default function HeroLabels() {
  return (
    <div aria-hidden className="pointer-events-none hidden xl:block">
      {LABELS.map(({ icon: Icon, text, position, delay }) => (
        <span
          key={text}
          className={`absolute ${position} animate-fade-up`}
          style={{ animationDelay: delay }}
        >
          <span
            className="flex items-center gap-2 whitespace-nowrap rounded-full border border-white/25 bg-white/10 py-1.5 pl-1.5 pr-3.5 text-sm font-medium text-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.3),0_8px_20px_-10px_rgba(2,6,23,0.6)] backdrop-blur-md motion-safe:animate-[float_8s_ease-in-out_infinite]"
            style={{ animationDelay: delay }}
          >
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sky-300/25 text-sky-100">
              <Icon size={14} />
            </span>
            {text}
            <Check size={14} className="text-sky-200" />
          </span>
        </span>
      ))}
    </div>
  );
}
