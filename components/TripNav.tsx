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

  // Nobody's identified themselves yet on the join screen - showing tabs
  // for pages that require a session would be premature clutter.
  if (pathname?.endsWith("/join")) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-stone-200 bg-white/90 backdrop-blur-md sm:sticky sm:top-0 sm:border-b sm:border-t-0">
      <ul className="mx-auto flex max-w-2xl justify-between px-2 py-1.5 sm:justify-start sm:gap-2 sm:px-4 sm:py-3">
        {TABS.map((tab) => {
          const href = `/trip/${tripId}/${tab.href}`;
          const active = pathname?.startsWith(href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1 sm:flex-none">
              <Link
                href={href}
                className={`flex flex-col items-center gap-0.5 rounded-2xl px-3 py-1.5 text-xs font-medium transition sm:flex-row sm:gap-1.5 sm:px-4 sm:py-2 sm:text-sm ${
                  active
                    ? "bg-orange-50 text-orange-600"
                    : "text-stone-500 hover:bg-stone-50 hover:text-stone-800"
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
