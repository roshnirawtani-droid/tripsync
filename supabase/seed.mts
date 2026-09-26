// Seeds a test trip with 5 members so the app can be clicked through
// without manually creating everything by hand.
//   - Riya, Siddharth, Karan, Aisha: joined (PIN set) and submitted
//     preferences.
//   - Siddharth has a "no_treks" dealbreaker, so any generated option that
//     involves trekking should show a conflict for him.
//   - Preethi: has NOT joined and has NOT submitted, so the response
//     tracker and "incomplete" matching path can be tested.
//
// Run with: npm run seed
// Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (loaded
// from .env.local via --env-file).

import { createClient } from "@supabase/supabase-js";
import bcrypt from "bcryptjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey);

interface SeedMember {
  name: string;
  pin: string | null; // null = doesn't join
  preference: {
    budgetMaxInr: number;
    availableStart: string;
    availableEnd: string;
    destinationRanking: string[];
    tripLengthDays: number;
    dealbreakers: string[];
  } | null; // null = doesn't submit
}

const MEMBERS: SeedMember[] = [
  {
    name: "Riya",
    pin: "1234",
    preference: {
      budgetMaxInr: 20000,
      availableStart: "2026-12-10",
      availableEnd: "2026-12-20",
      destinationRanking: ["beach", "mountains", "city", "adventure", "spiritual", "nature"],
      tripLengthDays: 5,
      dealbreakers: [],
    },
  },
  {
    name: "Siddharth",
    pin: "1111",
    preference: {
      budgetMaxInr: 18000,
      availableStart: "2026-12-12",
      availableEnd: "2026-12-22",
      destinationRanking: ["mountains", "beach", "nature", "adventure", "city", "spiritual"],
      tripLengthDays: 5,
      dealbreakers: ["no_treks"],
    },
  },
  {
    name: "Karan",
    pin: "2222",
    preference: {
      budgetMaxInr: 15000,
      availableStart: "2026-12-10",
      availableEnd: "2026-12-18",
      destinationRanking: ["beach", "city", "mountains", "nature", "adventure", "spiritual"],
      tripLengthDays: 4,
      dealbreakers: [],
    },
  },
  {
    name: "Aisha",
    pin: "3333",
    preference: {
      budgetMaxInr: 22000,
      availableStart: "2026-12-13",
      availableEnd: "2026-12-25",
      destinationRanking: ["nature", "mountains", "beach", "spiritual", "adventure", "city"],
      tripLengthDays: 6,
      dealbreakers: [],
    },
  },
  {
    name: "Preethi",
    pin: null,
    preference: null,
  },
];

async function main() {
  console.log("Creating trip...");
  const { data: trip, error: tripError } = await admin
    .from("trips")
    .insert({
      name: "College Friends Trip (seed)",
      date_window_start: "2026-12-10",
      date_window_end: "2026-12-25",
      response_deadline: "2026-10-15T00:00:00Z",
    })
    .select()
    .single();
  if (tripError || !trip) {
    throw new Error(`Could not create trip: ${tripError?.message}`);
  }

  console.log("Creating members...");
  const { data: members, error: membersError } = await admin
    .from("members")
    .insert(MEMBERS.map((m) => ({ trip_id: trip.id, name: m.name })))
    .select("id, name");
  if (membersError || !members) {
    throw new Error(`Could not create members: ${membersError?.message}`);
  }

  const coordinator = members.find((m) => m.name === "Riya");
  await admin.from("trips").update({ coordinator_member_id: coordinator?.id }).eq("id", trip.id);

  for (const seedMember of MEMBERS) {
    const member = members.find((m) => m.name === seedMember.name);
    if (!member) continue;

    if (seedMember.pin) {
      const pinHash = await bcrypt.hash(seedMember.pin, 10);
      await admin
        .from("members")
        .update({ pin_hash: pinHash, joined_at: new Date().toISOString() })
        .eq("id", member.id);
    }

    if (seedMember.preference) {
      const p = seedMember.preference;
      await admin.from("preferences").insert({
        trip_id: trip.id,
        member_id: member.id,
        budget_max_inr: p.budgetMaxInr,
        available_start: p.availableStart,
        available_end: p.availableEnd,
        destination_ranking: p.destinationRanking,
        trip_length_days: p.tripLengthDays,
        dealbreakers: p.dealbreakers,
        submitted_at: new Date().toISOString(),
      });
    }
  }

  console.log("\nSeeded trip successfully.\n");
  console.log(`Trip: ${trip.name}`);
  console.log(`Open: http://localhost:3000/trip/${trip.share_token}/join\n`);
  console.log("Members and PINs:");
  for (const m of MEMBERS) {
    console.log(`  ${m.name.padEnd(10)} ${m.pin ? `PIN ${m.pin}` : "(hasn't joined - test this)"}`);
  }
  console.log("\nSiddharth has a 'no_treks' dealbreaker - watch for a conflict on any trekking option.");
  console.log("Preethi hasn't submitted - the response tracker should show 4 of 5 and mark results incomplete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .then(() => process.exit(0));
