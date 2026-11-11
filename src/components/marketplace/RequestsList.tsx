"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { CalendarDays, Check, Clock3, RotateCcw, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

function formatDate(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(timestamp);
}

function formatRange(startAt: number, endAt: number) {
  return `${formatDate(startAt)} – ${formatDate(endAt)}`;
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-amber-50 text-amber-800",
    approved: "bg-emerald-50 text-emerald-800",
    declined: "bg-stone-100 text-stone-600",
    cancelled: "bg-stone-100 text-stone-600",
    returned: "bg-blue-50 text-blue-800",
  };
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[status] ?? styles.pending}`}
    >
      {status}
    </span>
  );
}

export function MyRequestsList() {
  const requests = useQuery(api.requests.listMyRequests, {});
  const cancel = useMutation(api.requests.cancel);
  const markReturned = useMutation(api.requests.markReturned);
  const [error, setError] = useState("");

  async function runAction(action: "cancel" | "return", requestId: Id<"borrowRequests">) {
    setError("");
    try {
      if (action === "cancel") await cancel({ requestId });
      else await markReturned({ requestId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update request.");
    }
  }

  if (requests === undefined) return <LoadingList />;
  if (requests.length === 0) {
    return (
      <EmptyState
        title="No borrowing requests yet"
        detail="When you request a neighborhood tool, its status and dates will appear here."
        href="/tools"
        linkText="Explore tools"
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {requests.map((request) => {
        return (
          <article
            key={request._id}
            className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-stone-900">
                    {request.tool?.name ?? "Listing unavailable"}
                  </h2>
                  <StatusBadge status={request.status} />
                  {request.isOverdue && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                      Overdue
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-stone-500">
                  {request.tool?.category ?? "Tool"} · Requested{" "}
                  {formatDate(request.createdAt)}
                </p>
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-stone-700">
                  <CalendarDays size={16} className="text-emerald-800" aria-hidden="true" />
                  {formatRange(request.startAt, request.endAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {request.status === "pending" && (
                  <button
                    type="button"
                    onClick={() => void runAction("cancel", request._id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700"
                  >
                    <X size={15} aria-hidden="true" />
                    Cancel request
                  </button>
                )}
                {request.status === "approved" && (
                  <button
                    type="button"
                    onClick={() => void runAction("return", request._id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-3.5 py-2 text-sm font-semibold text-white"
                  >
                    <RotateCcw size={15} aria-hidden="true" />
                    Mark returned
                  </button>
                )}
              </div>
            </div>
            <AutomationActivity
              reminders={request.reminders}
              events={request.automation}
            />
          </article>
        );
      })}
    </div>
  );
}

export function IncomingRequestsList() {
  const requests = useQuery(api.requests.listIncomingRequests, {});
  const respond = useMutation(api.requests.respond);
  const markReturned = useMutation(api.requests.markReturned);
  const [error, setError] = useState("");

  async function decide(
    requestId: Id<"borrowRequests">,
    decision: "approved" | "declined",
  ) {
    setError("");
    try {
      await respond({ requestId, decision });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update request.");
    }
  }

  async function returned(requestId: Id<"borrowRequests">) {
    setError("");
    try {
      await markReturned({ requestId });
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update loan.");
    }
  }

  if (requests === undefined) return <LoadingList />;
  if (requests.length === 0) {
    return (
      <EmptyState
        title="No incoming requests"
        detail="When a neighbor requests one of your listed tools, you’ll see it here."
        href="/my-listings"
        linkText="Manage your listings"
      />
    );
  }

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">{error}</p>}
      {requests.map((request) => {
        return (
          <article
            key={request._id}
            className="rounded-3xl border border-stone-200 bg-white p-5 sm:p-6"
          >
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-stone-900">
                    {request.tool?.name ?? "Listing unavailable"}
                  </h2>
                  <StatusBadge status={request.status} />
                  {request.isOverdue && (
                    <span className="rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-700">
                      Overdue
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-stone-500">
                  Requested by {request.borrowerName}
                </p>
                <p className="mt-4 inline-flex items-center gap-2 text-sm text-stone-700">
                  <CalendarDays size={16} className="text-emerald-800" aria-hidden="true" />
                  {formatRange(request.startAt, request.endAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {request.status === "pending" && (
                  <>
                    <button
                      type="button"
                      onClick={() => void decide(request._id, "declined")}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3.5 py-2 text-sm font-medium text-stone-700"
                    >
                      <X size={15} aria-hidden="true" />
                      Decline
                    </button>
                    <button
                      type="button"
                      onClick={() => void decide(request._id, "approved")}
                      className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-3.5 py-2 text-sm font-semibold text-white"
                    >
                      <Check size={15} aria-hidden="true" />
                      Approve
                    </button>
                  </>
                )}
                {request.status === "approved" && (
                  <button
                    type="button"
                    onClick={() => void returned(request._id)}
                    className="inline-flex items-center gap-1.5 rounded-full bg-emerald-800 px-3.5 py-2 text-sm font-semibold text-white"
                  >
                    <RotateCcw size={15} aria-hidden="true" />
                    Mark returned
                  </button>
                )}
              </div>
            </div>
            <AutomationActivity
              reminders={request.reminders}
              events={request.automation}
            />
          </article>
        );
      })}
    </div>
  );
}

function AutomationActivity({
  reminders,
  events,
}: {
  reminders: {
    status: "sent" | "failed";
    sentAt: number | null;
    updatedAt: number;
  }[];
  events: {
    eventType: "request.created" | "request.status_changed";
    status: "pending" | "sending" | "sent" | "failed";
    updatedAt: number;
    lastError: string | null;
  }[];
}) {
  const latestReminder = [...reminders].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  )[0];
  const latestEvent = [...events].sort(
    (a, b) => b.updatedAt - a.updatedAt,
  )[0];
  const reminderSent =
    latestReminder?.status === "sent" && latestReminder.sentAt !== null;
  const failed =
    latestReminder?.status === "failed" ||
    latestEvent?.status === "failed";
  if (!reminderSent && !failed) return null;

  return (
    <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-stone-100 pt-4 text-xs text-stone-500">
      {reminderSent && latestReminder?.sentAt && (
        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={14} aria-hidden="true" />
          Overdue reminder sent {formatDate(latestReminder.sentAt)}
        </span>
      )}
      {failed && (
        <span className="inline-flex items-center gap-1.5 text-amber-800">
          <Clock3 size={14} aria-hidden="true" />
          {latestReminder?.status === "failed"
            ? "Overdue reminder needs attention"
            : "Request notification needs attention"}
        </span>
      )}
    </div>
  );
}

function LoadingList() {
  return (
    <div className="space-y-4">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="h-36 animate-pulse rounded-3xl border border-stone-200 bg-white"
        />
      ))}
    </div>
  );
}

function EmptyState({
  title,
  detail,
  href,
  linkText,
}: {
  title: string;
  detail: string;
  href: string;
  linkText: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-14 text-center">
      <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-stone-100 text-stone-500">
        <CalendarDays size={20} aria-hidden="true" />
      </span>
      <h2 className="mt-4 text-lg font-semibold text-stone-900">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
        {detail}
      </p>
      <Link
        href={href}
        className="mt-5 inline-flex rounded-full bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white"
      >
        {linkText}
      </Link>
    </div>
  );
}
