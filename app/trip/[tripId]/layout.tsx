import { TripSessionProvider } from "@/lib/TripSessionContext";
import TripShell from "@/components/TripShell";

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
      <TripShell tripId={tripId}>{children}</TripShell>
    </TripSessionProvider>
  );
}
