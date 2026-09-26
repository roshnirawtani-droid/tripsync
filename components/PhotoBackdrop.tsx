import Image from "next/image";
import { ReactNode } from "react";
import { Photo } from "@/lib/backgrounds";

// Full-screen photo behind a single focused card (create trip, trip
// created, join). The photo is decorative - the card carries all the
// meaning - so it has empty alt text and a scrim that keeps the frosted
// card readable whatever the photo's brightness.
export default function PhotoBackdrop({ photo, children }: { photo: Photo; children: ReactNode }) {
  return (
    <div className="relative isolate flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-10">
      <Image
        key={photo.src}
        src={photo.src}
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 animate-[fade-in_0.6s_ease-out] object-cover"
        style={{ objectPosition: photo.position }}
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-slate-950/40 via-slate-950/15 to-slate-950/60" />
      {children}
    </div>
  );
}
