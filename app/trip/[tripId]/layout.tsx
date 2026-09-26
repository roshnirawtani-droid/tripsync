import { TripSessionProvider } from "@/lib/TripSessionContext";
import TripNav from "@/components/TripNav";

export default async function TripLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  return (
    <TripSessionProvider tripId={tripId}>
      <div className="min-h-screen bg-stone-50 pb-16 sm:pb-0">
        <TripNav tripId={tripId} />
        <main className="mx-auto max-w-2xl animate-fade-up px-4 py-6">{children}</main>
      </div>
    </TripSessionProvider>
  );
}
