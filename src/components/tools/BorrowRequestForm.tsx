"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

function todayAsDateInput() {
  return new Date().toISOString().slice(0, 10);
}

export default function BorrowRequestForm({
  toolId,
  toolName,
  isAvailable,
}: {
  toolId: Id<"tools">;
  toolName: string;
  isAvailable: boolean;
}) {
  const createRequest = useMutation(api.requests.create);
  const [isOpen, setIsOpen] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);

    try {
      await createRequest({
        toolId,
        startAt: Date.parse(`${startDate}T00:00:00.000Z`),
        endAt: Date.parse(`${endDate}T00:00:00.000Z`),
      });
      setMessage("Request sent. The lender will be notified.");
      setIsOpen(false);
      setStartDate("");
      setEndDate("");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not send request.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!isAvailable) {
    return (
      <button
        type="button"
        disabled
        className="w-full cursor-not-allowed rounded-full bg-stone-100 px-4 py-2.5 text-sm font-semibold text-stone-400"
      >
        Currently on loan
      </button>
    );
  }

  return (
    <div>
      {!isOpen ? (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="w-full rounded-full bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900"
        >
          Request to borrow
        </button>
      ) : (
        <form
          onSubmit={submit}
          className="space-y-3 rounded-2xl bg-stone-50 p-4"
          aria-label={`Request ${toolName}`}
        >
          <p className="text-sm font-semibold text-stone-800">
            Choose your date range
          </p>
          <label className="block text-xs font-medium text-stone-600">
            From
            <input
              required
              type="date"
              min={todayAsDateInput()}
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs font-medium text-stone-600">
            Until
            <input
              required
              type="date"
              min={startDate || todayAsDateInput()}
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="flex-1 rounded-full border border-stone-300 px-3 py-2 text-sm font-medium text-stone-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !startDate || !endDate}
              className="flex-1 rounded-full bg-emerald-800 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {isSubmitting ? "Sending…" : "Send request"}
            </button>
          </div>
        </form>
      )}
      {message && (
        <p role="status" className="mt-2 text-xs text-stone-600">
          {message}
        </p>
      )}
    </div>
  );
}
