
import { mutation, query } from "./_generated/server";
import {
  requireAdmin,
  requireCurrentUser,
} from "./lib/auth";
export const getCurrentIdentity = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) return null;

    return {
      clerkId: identity.subject,
      name: identity.name ?? null,
      email: identity.email ?? null,
    };
  },
});

export const getOrCreateCurrentUser = mutation({
  args: {},
  handler: async (ctx) => {
    // 1. Verify the authenticated Clerk identity
    const identity = await ctx.auth.getUserIdentity();

    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const clerkId = identity.subject;

    // 2. Find the existing LendLoop profile
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) =>
        q.eq("clerkId", clerkId)
      )
      .unique();

    const now = Date.now();

    // 3. Synchronise an existing profile
    if (existingUser) {
      await ctx.db.patch(existingUser._id, {
        name: identity.name ?? undefined,
        email: identity.email ?? undefined,
        imageUrl: typeof identity.picture === "string" ? identity.picture : undefined,
        updatedAt: now,
      });

      return existingUser._id;
    }

    // 4. Create a new profile
    const userId = await ctx.db.insert("users", {
      clerkId,
      name: identity.name ?? undefined,
      email: identity.email ?? undefined,
      imageUrl: typeof identity.picture === "string" ? identity.picture : undefined,

      // Role is assigned by the backend, never by the client
      role: "user",

      createdAt: now,
      updatedAt: now,
    });
    

    return userId;
  },
});

export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) return null;

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) =>
      q.eq("clerkId", identity.subject)
    )
    .unique();

  if (!user) return null;

  return {
    id: user._id,
    clerkId: user.clerkId,
    name: user.name ?? null,
    email: user.email ?? null,
    imageUrl: user.imageUrl ?? null,
    role: user.role,
    createdAt: user.createdAt,
  };
},
});

export const getAdminDashboardData = query({
  args: {},
  handler: async (ctx) => {
    const admin = await requireAdmin(ctx);

    return {
      message: "Admin access verified",
      adminName: admin.name,
      role: admin.role,
    };
  },
});