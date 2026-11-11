import { internal } from "./_generated/api";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { requireAdmin, requireCurrentUser } from "./lib/auth";
import { v } from "convex/values";

type RequestEventType =
  | "request.created"
  | "request.status_changed";

async function queueNotification(
  ctx: MutationCtx,
  requestId: Id<"borrowRequests">,
  eventType: RequestEventType,
  status: "pending" | "approved" | "declined" | "cancelled" | "returned",
  now: number,
) {
  const eventKey = `${requestId}:${status}`;
  const existing = await ctx.db
    .query("automationEvents")
    .withIndex("by_event_key", (q) => q.eq("eventKey", eventKey))
    .unique();
  if (existing) return;

  const eventId = await ctx.db.insert("automationEvents", {
    eventKey,
    requestId,
    eventType,
    status: "pending",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  });
  await ctx.scheduler.runAfter(
    0,
    internal.automation.dispatchNotification,
    { eventId },
  );
}

function publicTool(
  tool: Pick<import("./_generated/dataModel").Doc<"tools">, "_id" | "name" | "category">,
) {
  return { id: tool._id, name: tool.name, category: tool.category };
}

export const create = mutation({
  args: {
    toolId: v.id("tools"),
    startAt: v.number(),
    endAt: v.number(),
  },
  handler: async (ctx, args) => {
    const borrower = await requireCurrentUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || !tool.isListed) throw new Error("Listing not found.");
    if (tool.ownerId === borrower._id) {
      throw new Error("You cannot request your own listing.");
    }
    if (!tool.isAvailable) throw new Error("This tool is not available.");

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    if (args.startAt < today.getTime() || args.endAt < args.startAt) {
      throw new Error("Choose a valid future date range.");
    }

    const existingRequest = await ctx.db
      .query("borrowRequests")
      .withIndex("by_tool_status", (q) =>
        q.eq("toolId", tool._id).eq("status", "pending"),
      )
      .filter((q) => q.eq(q.field("borrowerId"), borrower._id))
      .first();
    if (existingRequest) {
      throw new Error("You already have a pending request for this tool.");
    }

    const now = Date.now();
    const requestId = await ctx.db.insert("borrowRequests", {
      toolId: tool._id,
      borrowerId: borrower._id,
      startAt: args.startAt,
      endAt: args.endAt,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });
    await queueNotification(
      ctx,
      requestId,
      "request.created",
      "pending",
      now,
    );
    return requestId;
  },
});

export const respond = mutation({
  args: {
    requestId: v.id("borrowRequests"),
    decision: v.union(v.literal("approved"), v.literal("declined")),
  },
  handler: async (ctx, args) => {
    const owner = await requireCurrentUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "pending") {
      throw new Error("Pending request not found.");
    }
    const tool = await ctx.db.get(request.toolId);
    if (!tool || !tool.isListed || tool.ownerId !== owner._id) {
      throw new Error("You can only act on requests for your own tools.");
    }
    if (args.decision === "approved" && !tool.isAvailable) {
      throw new Error("This tool is no longer available.");
    }

    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: args.decision,
      updatedAt: now,
    });
    if (args.decision === "approved") {
      await ctx.db.patch(tool._id, { isAvailable: false, updatedAt: now });
    }
    await queueNotification(
      ctx,
      request._id,
      "request.status_changed",
      args.decision,
      now,
    );
  },
});

export const cancel = mutation({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args) => {
    const borrower = await requireCurrentUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.borrowerId !== borrower._id) {
      throw new Error("You can only cancel your own requests.");
    }
    if (request.status !== "pending") {
      throw new Error("Only pending requests can be cancelled.");
    }

    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: "cancelled",
      updatedAt: now,
    });
    await queueNotification(
      ctx,
      request._id,
      "request.status_changed",
      "cancelled",
      now,
    );
  },
});

export const markReturned = mutation({
  args: { requestId: v.id("borrowRequests") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const request = await ctx.db.get(args.requestId);
    if (!request || request.status !== "approved") {
      throw new Error("Active loan not found.");
    }
    const tool = await ctx.db.get(request.toolId);
    if (!tool) throw new Error("Listing not found.");
    if (request.borrowerId !== user._id && tool.ownerId !== user._id) {
      throw new Error("Only the lender or borrower can return this loan.");
    }

    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: "returned",
      returnedAt: now,
      updatedAt: now,
    });
    await ctx.db.patch(tool._id, {
      isAvailable: true,
      updatedAt: now,
    });
    await queueNotification(
      ctx,
      request._id,
      "request.status_changed",
      "returned",
      now,
    );
  },
});

export const listMyRequests = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const now = Date.now();
    const requests = await ctx.db
      .query("borrowRequests")
      .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
      .order("desc")
      .collect();

    return Promise.all(
      requests.map(async (request) => {
        const tool = await ctx.db.get(request.toolId);
        const reminders = await ctx.db
          .query("loanReminders")
          .withIndex("by_request", (q) => q.eq("requestId", request._id))
          .collect();
        const events = await ctx.db
          .query("automationEvents")
          .withIndex("by_request", (q) => q.eq("requestId", request._id))
          .collect();

        return {
          ...request,
          isOverdue:
            request.status === "approved" &&
            request.endAt + 86_400_000 < now,
          tool: tool ? publicTool(tool) : null,
          reminders: reminders.map((reminder) => ({
            status: reminder.status,
            sentAt: reminder.sentAt ?? null,
            updatedAt: reminder.updatedAt,
          })),
          automation: events.map((event) => ({
            eventType: event.eventType,
            status: event.status,
            updatedAt: event.updatedAt,
            lastError: event.lastError ?? null,
          })),
        };
      }),
    );
  },
});

export const listIncomingRequests = query({
  args: {},
  handler: async (ctx) => {
    const owner = await requireCurrentUser(ctx);
    const now = Date.now();
    const tools = await ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", owner._id))
      .collect();
    const statuses = ["pending", "approved"] as const;
    const requests = (
      await Promise.all(
        tools.flatMap((tool) =>
          statuses.map((status) =>
            ctx.db
              .query("borrowRequests")
              .withIndex("by_tool_status", (q) =>
                q.eq("toolId", tool._id).eq("status", status),
              )
              .collect(),
          ),
        ),
      )
    ).flat();

    return Promise.all(
      requests.map(async (request) => {
        const tool = await ctx.db.get(request.toolId);
        const borrower = await ctx.db.get(request.borrowerId);
        const [reminders, events] = await Promise.all([
          ctx.db
            .query("loanReminders")
            .withIndex("by_request", (q) => q.eq("requestId", request._id))
            .collect(),
          ctx.db
            .query("automationEvents")
            .withIndex("by_request", (q) => q.eq("requestId", request._id))
            .collect(),
        ]);
        return {
          ...request,
          isOverdue:
            request.status === "approved" &&
            request.endAt + 86_400_000 < now,
          tool: tool ? publicTool(tool) : null,
          borrowerName: borrower?.name ?? "LendLoop member",
          reminders: reminders.map((reminder) => ({
            status: reminder.status,
            sentAt: reminder.sentAt ?? null,
            updatedAt: reminder.updatedAt,
          })),
          automation: events.map((event) => ({
            eventType: event.eventType,
            status: event.status,
            updatedAt: event.updatedAt,
            lastError: event.lastError ?? null,
          })),
        };
      }),
    );
  },
});

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    const [tools, borrowedRequests] = await Promise.all([
      ctx.db
        .query("tools")
        .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
        .collect(),
      ctx.db
        .query("borrowRequests")
        .withIndex("by_borrower", (q) => q.eq("borrowerId", user._id))
        .collect(),
    ]);

    const statuses = ["pending", "approved"] as const;
    const ownedRequests = (
      await Promise.all(
        tools.flatMap((tool) =>
          statuses.map((status) =>
            ctx.db
              .query("borrowRequests")
              .withIndex("by_tool_status", (q) =>
                q.eq("toolId", tool._id).eq("status", status),
              )
              .collect(),
          ),
        ),
      )
    ).flat();

    return {
      activeListings: tools.filter((tool) => tool.isListed).length,
      myOpenRequests: borrowedRequests.filter(
        (request) => request.status === "pending",
      ).length,
      incomingRequests: ownedRequests.filter(
        (request) => request.status === "pending",
      ).length,
      activeLoans:
        borrowedRequests.filter((request) => request.status === "approved")
          .length +
        ownedRequests.filter((request) => request.status === "approved").length,
    };
  },
});

export const listAdminLoans = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const [active, returned] = await Promise.all([
      ctx.db
        .query("borrowRequests")
        .withIndex("by_status", (q) => q.eq("status", "approved"))
        .collect(),
      ctx.db
        .query("borrowRequests")
        .withIndex("by_status", (q) => q.eq("status", "returned"))
        .collect(),
    ]);
    const requests = [...active, ...returned].sort(
      (a, b) => b.updatedAt - a.updatedAt,
    );

    return Promise.all(
      requests.map(async (request) => {
        const [tool, borrower] = await Promise.all([
          ctx.db.get(request.toolId),
          ctx.db.get(request.borrowerId),
        ]);
        const lender = tool ? await ctx.db.get(tool.ownerId) : null;
        return {
          ...request,
          toolName: tool?.name ?? "Removed listing",
          borrowerName: borrower?.name ?? "LendLoop member",
          lenderName: lender?.name ?? "LendLoop member",
        };
      }),
    );
  },
});

export const listAdminLenders = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const users = await ctx.db.query("users").collect();
    return users.map((user) => ({
      id: user._id,
      name: user.name ?? "LendLoop member",
      isTrustedLender: user.isTrustedLender === true,
    }));
  },
});

export const setTrustedLender = mutation({
  args: {
    userId: v.id("users"),
    isTrustedLender: v.boolean(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found.");
    await ctx.db.patch(user._id, {
      isTrustedLender: args.isTrustedLender,
      updatedAt: Date.now(),
    });
  },
});
