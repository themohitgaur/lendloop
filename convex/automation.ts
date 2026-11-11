import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  internalQuery,
  type MutationCtx,
} from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [60_000, 300_000, 900_000, 3_600_000];
const encoder = new TextEncoder();

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing Convex environment variable: ${name}`);
  return value;
}

async function signBody(secret: string, timestamp: string, body: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(`${timestamp}.${body}`),
  );
  return Array.from(new Uint8Array(signature), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function failNotification(
  ctx: MutationCtx,
  eventId: Id<"automationEvents">,
  attempt: number,
  error: string,
) {
  const event = await ctx.db.get(eventId);
  if (!event || event.status === "sent" || event.attempts !== attempt) return;

  const now = Date.now();
  const failed = attempt >= MAX_ATTEMPTS;
  await ctx.db.patch(event._id, {
    status: failed ? "failed" : "pending",
    lastError: error.slice(0, 500),
    updatedAt: now,
  });

  if (!failed) {
    await ctx.scheduler.runAfter(
      RETRY_DELAYS_MS[Math.min(attempt - 1, RETRY_DELAYS_MS.length - 1)],
      internal.automation.dispatchNotification,
      { eventId },
    );
  }
}

export const getNotificationPayload = internalQuery({
  args: { eventId: v.id("automationEvents") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return null;
    const request = await ctx.db.get(event.requestId);
    if (!request) throw new Error("Request for notification no longer exists.");
    const [tool, borrower] = await Promise.all([
      ctx.db.get(request.toolId),
      ctx.db.get(request.borrowerId),
    ]);
    if (!tool || !borrower) {
      throw new Error("Request notification is missing related records.");
    }

    const recipient =
      event.eventType === "request.created"
        ? await ctx.db.get(tool.ownerId)
        : borrower;
    if (!recipient?.email) {
      throw new Error("Notification recipient has no email address.");
    }

    return {
      eventId: event._id,
      eventType: event.eventType,
      requestId: request._id,
      status: request.status,
      recipientEmail: recipient.email,
      recipientName: recipient.name ?? "LendLoop member",
      toolName: tool.name,
      category: tool.category,
      startAt: request.startAt,
      endAt: request.endAt,
    };
  },
});

export const claimNotification = internalMutation({
  args: { eventId: v.id("automationEvents") },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.status === "sent" || event.status === "failed") {
      return null;
    }
    const attempt = event.attempts + 1;
    await ctx.db.patch(event._id, {
      status: "sending",
      attempts: attempt,
      updatedAt: Date.now(),
    });
    return { attempt };
  },
});

export const markNotificationSent = internalMutation({
  args: {
    eventId: v.id("automationEvents"),
    attempt: v.number(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event || event.status === "sent" || event.attempts !== args.attempt) {
      return;
    }
    const now = Date.now();
    await ctx.db.patch(event._id, {
      status: "sent",
      lastError: undefined,
      sentAt: now,
      updatedAt: now,
    });
  },
});

export const recordNotificationFailure = internalMutation({
  args: {
    eventId: v.id("automationEvents"),
    attempt: v.number(),
    error: v.string(),
  },
  handler: async (ctx, args) => {
    await failNotification(ctx, args.eventId, args.attempt, args.error);
  },
});

export const dispatchNotification = internalAction({
  args: { eventId: v.id("automationEvents") },
  handler: async (ctx, args) => {
    const claim = await ctx.runMutation(
      internal.automation.claimNotification,
      { eventId: args.eventId },
    );
    if (!claim) return;

    try {
      const payload = await ctx.runQuery(
        internal.automation.getNotificationPayload,
        { eventId: args.eventId },
      );
      if (!payload) throw new Error("Notification event no longer exists.");

      const webhookUrl = requiredEnv("N8N_REQUEST_WEBHOOK_URL");
      const secret = requiredEnv("LENDLOOP_HMAC_SECRET");
      const body = JSON.stringify(payload);
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const signature = await signBody(secret, timestamp, body);
      const response = await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-lendloop-timestamp": timestamp,
          "x-lendloop-signature": `v1=${signature}`,
        },
        body,
        signal: AbortSignal.timeout(10_000),
      });

      if (!response.ok) {
        throw new Error(`n8n returned HTTP ${response.status}.`);
      }

      await ctx.runMutation(internal.automation.markNotificationSent, {
        eventId: args.eventId,
        attempt: claim.attempt,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown notification error.";
      await ctx.runMutation(internal.automation.recordNotificationFailure, {
        eventId: args.eventId,
        attempt: claim.attempt,
        error: message,
      });
      console.error("LendLoop notification delivery failed:", message);
    }
  },
});

export const getOverdueLoans = internalQuery({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const activeLoans = await ctx.db
      .query("borrowRequests")
      .withIndex("by_status", (q) => q.eq("status", "approved"))
      .collect();
    const overdue = activeLoans.filter(
      (request) => request.endAt + 86_400_000 < now,
    );

    return (
      await Promise.all(
        overdue.map(async (request) => {
          const reminderDate = new Date(now).toISOString().slice(0, 10);
          const idempotencyKey = `overdue:${request._id}:${reminderDate}`;
          const reminder = await ctx.db
            .query("loanReminders")
            .withIndex("by_idempotency_key", (q) =>
              q.eq("idempotencyKey", idempotencyKey),
            )
            .unique();
          if (reminder?.status === "sent") return null;

          const [tool, borrower] = await Promise.all([
            ctx.db.get(request.toolId),
            ctx.db.get(request.borrowerId),
          ]);
          if (!tool) {
            throw new Error("Overdue loan is missing its tool listing.");
          }

          return {
            requestId: request._id,
            idempotencyKey,
            recipientEmail: borrower?.email ?? null,
            recipientName: borrower?.name ?? "LendLoop member",
            toolName: tool.name,
            dueAt: request.endAt + 86_399_999,
          };
        }),
      )
    ).filter((loan) => loan !== null);
  },
});

export const recordReminder = internalMutation({
  args: {
    requestId: v.id("borrowRequests"),
    idempotencyKey: v.string(),
    status: v.union(v.literal("sent"), v.literal("failed")),
    detail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.idempotencyKey.startsWith(`overdue:${args.requestId}:`)) {
      throw new Error("Reminder idempotency key does not match the loan.");
    }
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Loan for reminder no longer exists.");
    const existing = await ctx.db
      .query("loanReminders")
      .withIndex("by_idempotency_key", (q) =>
        q.eq("idempotencyKey", args.idempotencyKey),
      )
      .unique();
    const now = Date.now();

    if (existing) {
      if (existing.requestId !== args.requestId) {
        throw new Error("Reminder idempotency key is already in use.");
      }
      if (existing.status === "sent") return existing._id;
      await ctx.db.patch(existing._id, {
        status: args.status,
        detail: args.detail?.slice(0, 500),
        sentAt: args.status === "sent" ? now : undefined,
        updatedAt: now,
      });
      return existing._id;
    }

    return ctx.db.insert("loanReminders", {
      requestId: args.requestId,
      idempotencyKey: args.idempotencyKey,
      status: args.status,
      detail: args.detail?.slice(0, 500),
      sentAt: args.status === "sent" ? now : undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});
