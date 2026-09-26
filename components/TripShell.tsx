"use client";

import { ReactNode } from "react";
import { usePathname } from "next/navigation";
import TripNav from "@/components/TripNav";
import TripHeroBand from "@/components/TripHeroBand";

// The join screen is a full-screen photo with one card, so it skips the
// nav, header band and content column that every signed-in page shares.
export default function TripShell({ tripId, children }: { tripId: string; children: ReactNode }) {
  const pathname = usePathname();
  if (pathname?.endsWith("/join")) return <>{children}</>;

  return (
    <div className="relative isolate min-h-screen bg-slate-950 pb-20 text-white sm:pb-0">
      <TripNav tripId={tripId} />
      <TripHeroBand tripId={tripId} />
      <main className="relative mx-auto -mt-8 max-w-2xl animate-fade-up px-4 pb-10">{children}</main>
    </div>
  );
}
