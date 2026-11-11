import { mutation, query } from "./_generated/server";
import { requireAdmin, requireCurrentUser } from "./lib/auth";
import { v } from "convex/values";

const conditionValidator = v.union(
  v.literal("new"),
  v.literal("good"),
  v.literal("fair"),
  v.literal("worn"),
);

function validateToolInput(input: {
  name: string;
  category: string;
  description: string;
}) {
  if (!input.name.trim() || input.name.trim().length > 80) {
    throw new Error("Tool name must be between 1 and 80 characters.");
  }
  if (!input.category.trim() || input.category.trim().length > 40) {
    throw new Error("Category must be between 1 and 40 characters.");
  }
  if (!input.description.trim() || input.description.trim().length > 500) {
    throw new Error("Description must be between 1 and 500 characters.");
  }
}

export const listPublicTools = query({
  args: {
    category: v.optional(v.string()),
    availableOnly: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const viewer = identity
      ? await ctx.db
          .query("users")
          .withIndex("by_clerk_id", (q) =>
            q.eq("clerkId", identity.subject),
          )
          .unique()
      : null;
    const listedTools = await ctx.db
      .query("tools")
      .withIndex("by_listing_availability", (q) => q.eq("isListed", true))
      .collect();
    const tools = listedTools.filter(
      (tool) =>
        (!args.availableOnly || tool.isAvailable) &&
        (!args.category || tool.category === args.category),
    );

    return Promise.all(
      tools.map(async (tool) => {
        const owner = await ctx.db.get(tool.ownerId);

        return {
          id: tool._id,
          name: tool.name,
          category: tool.category,
          condition: tool.condition,
          description: tool.description,
          isAvailable: tool.isAvailable,
          isTrustedLender: owner?.isTrustedLender === true,
          isOwnedByViewer: viewer?._id === tool.ownerId,
        };
      }),
    );
  },
});

export const listMyListings = query({
  args: {},
  handler: async (ctx) => {
    const user = await requireCurrentUser(ctx);
    return ctx.db
      .query("tools")
      .withIndex("by_owner", (q) => q.eq("ownerId", user._id))
      .collect();
  },
});

export const listAdminTools = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    const tools = await ctx.db.query("tools").collect();

    return Promise.all(
      tools.map(async (tool) => {
        const owner = await ctx.db.get(tool.ownerId);
        return {
          ...tool,
          ownerName: owner?.name ?? "LendLoop member",
          isTrustedLender: owner?.isTrustedLender === true,
        };
      }),
    );
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    category: v.string(),
    condition: conditionValidator,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    validateToolInput(args);
    const now = Date.now();

    return ctx.db.insert("tools", {
      ownerId: user._id,
      name: args.name.trim(),
      category: args.category.trim(),
      condition: args.condition,
      description: args.description.trim(),
      isListed: true,
      isAvailable: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    toolId: v.id("tools"),
    name: v.string(),
    category: v.string(),
    condition: conditionValidator,
    description: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || !tool.isListed) throw new Error("Listing not found.");
    if (tool.ownerId !== user._id) {
      throw new Error("You can only edit your own listings.");
    }

    validateToolInput(args);
    await ctx.db.patch(tool._id, {
      name: args.name.trim(),
      category: args.category.trim(),
      condition: args.condition,
      description: args.description.trim(),
      updatedAt: Date.now(),
    });
  },
});

export const remove = mutation({
  args: { toolId: v.id("tools") },
  handler: async (ctx, args) => {
    const user = await requireCurrentUser(ctx);
    const tool = await ctx.db.get(args.toolId);
    if (!tool || !tool.isListed) throw new Error("Listing not found.");

    const isAdmin = user.role === "admin";
    if (!isAdmin && tool.ownerId !== user._id) {
      throw new Error("You can only remove your own listings.");
    }

    if (!isAdmin) {
      const pending = await ctx.db
        .query("borrowRequests")
        .withIndex("by_tool_status", (q) =>
          q.eq("toolId", tool._id).eq("status", "pending"),
        )
        .first();
      const activeLoan = await ctx.db
        .query("borrowRequests")
        .withIndex("by_tool_status", (q) =>
          q.eq("toolId", tool._id).eq("status", "approved"),
        )
        .first();
      if (pending || activeLoan) {
        throw new Error(
          "Resolve pending requests and active loans before removing this listing.",
        );
      }
    }

    await ctx.db.patch(tool._id, {
      isListed: false,
      isAvailable: false,
      updatedAt: Date.now(),
    });
  },
});
