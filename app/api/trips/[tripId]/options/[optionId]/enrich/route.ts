import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { getTripByToken } from "@/lib/trip-server";
import { geocodeDestination, fetchAttractions, fetchStays } from "@/lib/enrichment/geoapify";
import { fetchWeather } from "@/lib/enrichment/weather";
import { OptionEnrichment } from "@/lib/types";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tripId: string; optionId: string }> }
) {
  const { tripId, optionId } = await params;
  const admin = supabaseAdmin();
  const trip = await getTripByToken(admin, tripId);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const { data: option, error: optionError } = await admin
    .from("options")
    .select("*")
    .eq("id", optionId)
    .eq("trip_id", trip.id)
    .maybeSingle();
  if (optionError || !option) {
    return NextResponse.json({ error: "Option not found for this trip" }, { status: 404 });
  }

  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "true";
  if (option.enrichment && !forceRefresh) {
    return NextResponse.json({ enrichment: option.enrichment as OptionEnrichment });
  }

  const geoapifyKey = process.env.GEOAPIFY_API_KEY;

  let attractions: OptionEnrichment["attractions"] = null;
  let stays: OptionEnrichment["stays"] = null;
  let weather: OptionEnrichment["weather"] = null;

  if (geoapifyKey) {
    try {
      const point = await geocodeDestination(option.destination, geoapifyKey);
      if (point) {
        const [attractionsResult, staysResult] = await Promise.allSettled([
          fetchAttractions(point, geoapifyKey),
          fetchStays(point, geoapifyKey),
        ]);
        if (attractionsResult.status === "fulfilled") attractions = attractionsResult.value;
        if (staysResult.status === "fulfilled") stays = staysResult.value;

        try {
          const w = await fetchWeather(point, trip.date_window_start, trip.date_window_end);
          weather = w;
        } catch {
          // leave weather null - one failed API shouldn't break the rest
        }
      }
    } catch {
      // geocoding failed - leave attractions/stays/weather null
    }
  }

  const enrichment: OptionEnrichment = {
    attractions,
    stays,
    weather,
    fetchedAt: new Date().toISOString(),
  };

  // Only cache a result that actually has something in it - an all-null
  // response (e.g. GEOAPIFY_API_KEY not set yet) shouldn't get stuck as
  // the permanent cached value once the key is added later.
  if (attractions || stays || weather) {
    await admin.from("options").update({ enrichment }).eq("id", optionId);
  }

  return NextResponse.json({ enrichment });
}
