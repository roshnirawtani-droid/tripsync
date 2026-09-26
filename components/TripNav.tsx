"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ClipboardList, MessageCircle, ListChecks, Map, CircleHelp } from "lucide-react";

const TABS = [
  { href: "preferences", label: "Submit", icon: ClipboardList },
  { href: "status", label: "Status", icon: ListChecks },
  { href: "options", label: "Options", icon: Map },
  { href: "chats", label: "Chats", icon: MessageCircle },
  { href: "help", label: "Help", icon: CircleHelp },
];

export default function TripNav({ tripId }: { tripId: string }) {
  const pathname = usePathname();

  // A bottom tab bar on phones (thumb reach); on larger screens a frosted
  // pill floating over the page's photo band.
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-stone-200 bg-white/90 backdrop-blur-md sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-4 sm:-translate-x-1/2 sm:rounded-full sm:border sm:border-white/70 sm:bg-white/75 sm:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_1px_2px_rgba(15,23,42,0.08),0_12px_32px_-12px_rgba(15,23,42,0.45)] sm:backdrop-blur-2xl sm:backdrop-saturate-150">
      <ul className="mx-auto flex max-w-2xl justify-between px-2 py-1.5 sm:gap-1 sm:px-1.5">
        {TABS.map((tab) => {
          const href = `/trip/${tripId}/${tab.href}`;
          const active = pathname?.startsWith(href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1 sm:flex-none">
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-xs font-medium transition sm:flex-row sm:gap-1.5 sm:rounded-full sm:px-4 sm:py-2 sm:text-sm ${
                  active
                    ? "btn-glacier"
                    : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.4 : 2} />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
