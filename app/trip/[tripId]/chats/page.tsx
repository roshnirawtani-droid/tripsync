"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { useRequireTripSession } from "@/lib/TripSessionContext";
import { Conversation } from "@/lib/types";
import { MessageCirclePlus, MessagesSquare } from "lucide-react";
import { button, card, input, pageHeading } from "@/lib/ui";

interface MemberRow {
  id: string;
  name: string;
}

export default function ChatsPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = use(params);
  const router = useRouter();
  const { session, loading: sessionLoading } = useRequireTripSession();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [members, setMembers] = useState<MemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    async function load() {
      const [convRes, membersRes] = await Promise.all([
        fetch(`/api/trips/${tripId}/conversations`),
        fetch(`/api/trips/${tripId}/members`),
      ]);
      if (convRes.ok) setConversations((await convRes.json()).conversations ?? []);
      if (membersRes.ok) {
        const json = await membersRes.json();
        setMembers((json.members ?? []).filter((m: { id: string }) => m.id !== session?.memberId));
      }
      setLoading(false);
    }
    load();
  }, [tripId, session]);

  function toggleMember(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (selected.size === 0) {
      setError("Pick at least one other member");
      return;
    }
    setCreating(true);
    const res = await fetch(`/api/trips/${tripId}/conversations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberIds: Array.from(selected), title: title.trim() || undefined }),
    });
    const json = await res.json();
    setCreating(false);
    if (!res.ok) {
      setError(json.error ?? "Could not start chat");
      return;
    }
    router.push(`/trip/${tripId}/chats/${json.conversation.id}`);
  }

  if (sessionLoading || loading) {
    return <p className="pt-10 text-white/80">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className={pageHeading}>Private chats</h1>
        <button
          onClick={() => setShowNew((v) => !v)}
          className={`${button.primary} !px-4 !py-2 !text-sm`}
        >
          <MessageCirclePlus size={16} /> {showNew ? "Cancel" : "New chat"}
        </button>
      </div>

      {showNew && (
        <form onSubmit={handleCreate} className={`${card} space-y-4`}>
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-700">Who&apos;s in this chat?</label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMember(m.id)}
                  className={button.chip(selected.has(m.id))}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-stone-700">Title (optional)</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={input}
              placeholder="e.g. Kasol vs Manali, or Riya's surprise"
            />
          </div>
          {error && <p className="text-sm text-rose-600">{error}</p>}
          <button type="submit" disabled={creating} className={`${button.primary} w-full`}>
            {creating ? "Starting…" : "Start chat"}
          </button>
        </form>
      )}

      <ul className="space-y-2">
        {conversations.map((c) => (
          <li key={c.id}>
            <Link href={`/trip/${tripId}/chats/${c.id}`} className={`block ${card} transition hover:shadow-md`}>
              <p className="text-sm font-bold text-stone-800">
                {c.title || c.participantNames?.filter((n) => n !== session?.name).join(", ") || "Chat"}
              </p>
              <p className="mt-0.5 truncate text-sm text-stone-500">
                {c.lastMessage ? c.lastMessage.body : "No messages yet"}
              </p>
            </Link>
          </li>
        ))}
        {conversations.length === 0 && (
          <li className={`${card} flex flex-col items-center gap-2 py-10 text-center text-sm text-stone-500`}>
            <MessagesSquare size={30} className="text-brand-300" />
            <span className="font-semibold text-stone-700">No side chats yet</span>
            Plan a surprise, split a booking, or argue about the itinerary - just the people you pick.
            {!showNew && (
              <button onClick={() => setShowNew(true)} className={`${button.primary} mt-2 !px-4 !py-2 !text-sm`}>
                <MessageCirclePlus size={16} /> Start a chat
              </button>
            )}
          </li>
        )}
      </ul>
    </div>
  );
}
