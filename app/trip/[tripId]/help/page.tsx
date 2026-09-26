"use client";

import { use, useEffect, useState } from "react";
import { useRequireTripSession } from "@/lib/TripSessionContext";
import { HelpQuestion } from "@/lib/types";
import { Sparkles, MessageSquareText, CircleHelp } from "lucide-react";
import { button, card, pageHeading, pageSubheading } from "@/lib/ui";

export default function HelpPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = use(params);
  const { loading: sessionLoading } = useRequireTripSession();

  const [questions, setQuestions] = useState<HelpQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState("");
  const [askAI, setAskAI] = useState(false);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/trips/${tripId}/help`);
      if (res.ok) setQuestions((await res.json()).questions ?? []);
      setLoading(false);
    }
    load();
  }, [tripId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!question.trim()) return;
    setError(null);
    setPosting(true);
    const res = await fetch(`/api/trips/${tripId}/help`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, askAI }),
    });
    const json = await res.json();
    setPosting(false);
    if (!res.ok) {
      setError(json.error ?? "Could not post question");
      return;
    }
    setQuestions((prev) => [json.question, ...prev]);
    setQuestion("");
    setAskAI(false);
  }

  if (sessionLoading || loading) {
    return <p className="text-stone-500">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className={pageHeading}>Help</h1>
        <p className={pageSubheading}>
          Ask the group a question, or ask the AI helper about the trip&apos;s budget, options, and roadmap.
        </p>
      </div>

      <form onSubmit={handleSubmit} className={`${card} space-y-3`}>
        <textarea
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          rows={3}
          className="w-full rounded-2xl border-2 border-stone-200 bg-white px-4 py-3 text-base text-stone-800 outline-none transition placeholder:text-stone-400 focus:border-orange-400"
          placeholder="e.g. What's the total per-person cost for the Goa option?"
        />
        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm font-medium text-stone-600">
            <input
              type="checkbox"
              checked={askAI}
              onChange={(e) => setAskAI(e.target.checked)}
              className="h-4 w-4 accent-orange-500"
            />
            <Sparkles size={15} className="text-orange-500" /> Ask AI
          </label>
          <button
            type="submit"
            disabled={posting || !question.trim()}
            className={askAI ? button.primary : button.secondary}
          >
            {posting ? (askAI ? "Asking AI…" : "Posting…") : askAI ? "Ask AI" : "Post to group"}
          </button>
        </div>
        {error && <p className="text-sm text-rose-600">{error}</p>}
      </form>

      <ul className="space-y-3">
        {questions.map((q) => (
          <li key={q.id} className={card}>
            <p className="flex items-center gap-1.5 text-sm font-bold text-stone-800">
              <MessageSquareText size={14} className="text-stone-400" /> {q.memberName}
            </p>
            <p className="mt-1 text-sm text-stone-700">{q.question}</p>
            {q.ai_answer && (
              <div className="mt-3 rounded-2xl bg-gradient-to-br from-orange-50 to-rose-50 px-3.5 py-2.5 text-sm text-stone-800">
                <p className="mb-1 flex items-center gap-1 text-xs font-bold text-orange-600">
                  <Sparkles size={12} /> AI answer
                </p>
                {q.ai_answer}
              </div>
            )}
          </li>
        ))}
        {questions.length === 0 && (
          <li className={`${card} flex flex-col items-center gap-2 py-8 text-center text-sm text-stone-500`}>
            <CircleHelp size={28} className="text-stone-300" />
            No questions yet.
          </li>
        )}
      </ul>
    </div>
  );
}
