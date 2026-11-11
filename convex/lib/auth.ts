
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";

type AuthContext = QueryCtx | MutationCtx;

/**
 * Returns the authenticated LendLoop user.
 * Throws if the session or user profile is missing.
 */
export async function requireCurrentUser(
  ctx: AuthContext
): Promise<Doc<"users">> {
  const identity = await ctx.auth.getUserIdentity();

  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const user = await ctx.db
    .query("users")
    .withIndex("by_clerk_id", (q) =>
      q.eq("clerkId", identity.subject)
    )
    .unique();

  if (!user) {
    throw new Error("User profile not found");
  }

  return user;
}

/**
 * Returns the authenticated user only if they are an admin.
 */
export async function requireAdmin(
  ctx: AuthContext
): Promise<Doc<"users">> {
  const user = await requireCurrentUser(ctx);

  if (user.role !== "admin") {
    throw new Error("Forbidden: Admin access required");
  }

  return user;
}
