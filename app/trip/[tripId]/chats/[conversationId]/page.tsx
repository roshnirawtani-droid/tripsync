"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import { useRequireTripSession } from "@/lib/TripSessionContext";
import { Message, TripOption } from "@/lib/types";
import { ArrowLeft, Send, MapPin } from "lucide-react";
import { input } from "@/lib/ui";

const POLL_INTERVAL_MS = 3000;

export default function ConversationPage({
  params,
}: {
  params: Promise<{ tripId: string; conversationId: string }>;
}) {
  const { tripId, conversationId } = use(params);
  const { session, loading: sessionLoading } = useRequireTripSession();

  const [messages, setMessages] = useState<Message[]>([]);
  const [options, setOptions] = useState<TripOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [body, setBody] = useState("");
  const [attachOptionId, setAttachOptionId] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;

    async function loadMessages() {
      const res = await fetch(`/api/trips/${tripId}/conversations/${conversationId}/messages`);
      if (cancelled) return;
      if (res.ok) {
        const json = await res.json();
        setMessages(json.messages ?? []);
        setError(null);
      } else if (res.status === 403 || res.status === 404) {
        const json = await res.json();
        setError(json.error ?? "Can't open this chat");
      }
      setLoading(false);
    }

    loadMessages();
    const interval = setInterval(loadMessages, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [tripId, conversationId, session]);

  useEffect(() => {
    async function loadOptions() {
      const res = await fetch(`/api/trips/${tripId}/options`);
      if (res.ok) setOptions((await res.json()).options ?? []);
    }
    loadOptions();
  }, [tripId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSending(true);
    const res = await fetch(`/api/trips/${tripId}/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body, attachedOptionId: attachOptionId || null }),
    });
    setSending(false);
    if (res.ok) {
      const json = await res.json();
      setMessages((prev) => [...prev, json.message]);
      setBody("");
      setAttachOptionId("");
    }
  }

  if (sessionLoading || loading) {
    return <p className="pt-10 text-white/80">Loading…</p>;
  }
  if (error) {
    return (
      <div className="space-y-4">
        <Link href={`/trip/${tripId}/chats`} className="flex items-center gap-1 text-sm font-semibold text-sky-100 transition hover:text-white">
          <ArrowLeft size={16} /> All chats
        </Link>
        <p className="text-sm font-medium text-rose-300">{error}</p>
      </div>
    );
  }

  const optionById = new Map(options.map((o) => [o.id, o]));

  return (
    <div className="flex h-[calc(100dvh-15rem)] min-h-[24rem] flex-col sm:h-[calc(100dvh-13rem)]">
      <Link
        href={`/trip/${tripId}/chats`}
        className="mb-3 flex items-center gap-1 text-sm font-semibold text-sky-100 transition hover:text-white"
      >
        <ArrowLeft size={16} /> All chats
      </Link>

      <div className="flex-1 space-y-3 overflow-y-auto pb-2">
        {messages.map((m) => {
          const attached = m.attached_option_id ? optionById.get(m.attached_option_id) : null;
          const isMe = m.member_id === session?.memberId;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  isMe
                    ? "bg-sky-800 text-white"
                    : "border border-stone-200 bg-white text-stone-800"
                }`}
              >
                {!isMe && <p className="mb-0.5 text-xs font-semibold opacity-70">{m.senderName}</p>}
                <p>{m.body}</p>
                {attached && (
                  <Link
                    href={`/trip/${tripId}/options/${attached.id}`}
                    className={`mt-1.5 flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-xs ${
                      isMe ? "border-white/30 bg-white/10" : "border-stone-200 bg-stone-50"
                    }`}
                  >
                    <MapPin size={13} /> {attached.destination}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
        {messages.length === 0 && (
          <p className="text-center text-sm text-white/75">No messages yet. Say hi!</p>
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="space-y-2 border-t border-white/15 pt-3">
        {options.length > 0 && (
          <select
            value={attachOptionId}
            onChange={(e) => setAttachOptionId(e.target.value)}
            className="w-full rounded-xl border-2 border-stone-200 bg-white px-3 py-1.5 text-xs text-stone-600"
          >
            <option value="">Attach a trip option (optional)</option>
            {options.map((o) => (
              <option key={o.id} value={o.id}>
                {o.destination}
              </option>
            ))}
          </select>
        )}
        <div className="flex gap-2">
          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            className={`${input} flex-1 !py-2.5`}
            placeholder="Type a message…"
          />
          <button
            type="submit"
            disabled={sending || !body.trim()}
            aria-label="Send message"
            className="btn-glacier flex items-center justify-center rounded-full px-4 transition active:scale-95 disabled:opacity-50"
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}
