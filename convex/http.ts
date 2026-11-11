import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";

const http = httpRouter();
const encoder = new TextEncoder();

function bytesFromHex(hex: string) {
  if (!/^[\da-f]{64}$/i.test(hex)) return null;
  return Uint8Array.from(
    hex.match(/.{2}/g) ?? [],
    (byte) => Number.parseInt(byte, 16),
  );
}

async function isValidSignature(
  request: Request,
  body: string,
  secret: string,
) {
  const timestamp = request.headers.get("x-lendloop-timestamp");
  const signature = request.headers
    .get("x-lendloop-signature")
    ?.replace(/^v1=/, "");
  if (!timestamp || !/^\d+$/.test(timestamp) || !signature) return false;
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const signatureBytes = bytesFromHex(signature);
  if (!signatureBytes) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    encoder.encode(`${timestamp}.${body}`),
  );
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

http.route({
  path: "/n8n/overdue",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.LENDLOOP_HMAC_SECRET;
    if (!secret) throw new Error("Missing Convex environment variable: LENDLOOP_HMAC_SECRET");
    const body = await request.text();
    if (!(await isValidSignature(request, body, secret))) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }
    if (!parsedBody || typeof parsedBody !== "object") {
      return jsonResponse({ error: "Invalid request" }, 400);
    }

    const loans = await ctx.runQuery(internal.automation.getOverdueLoans, {});
    return jsonResponse({ loans });
  }),
});

http.route({
  path: "/n8n/reminders",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    const secret = process.env.LENDLOOP_HMAC_SECRET;
    if (!secret) throw new Error("Missing Convex environment variable: LENDLOOP_HMAC_SECRET");
    const body = await request.text();
    if (!(await isValidSignature(request, body, secret))) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    let parsedBody: unknown;
    try {
      parsedBody = JSON.parse(body);
    } catch {
      return jsonResponse({ error: "Invalid JSON" }, 400);
    }
    if (!parsedBody || typeof parsedBody !== "object") {
      return jsonResponse({ error: "Invalid request" }, 400);
    }
    const payload = parsedBody as Record<string, unknown>;
    if (
      typeof payload.requestId !== "string" ||
      typeof payload.idempotencyKey !== "string" ||
      (payload.status !== "sent" && payload.status !== "failed") ||
      (payload.detail !== undefined && typeof payload.detail !== "string")
    ) {
      return jsonResponse({ error: "Invalid reminder payload" }, 400);
    }

    await ctx.runMutation(internal.automation.recordReminder, {
      requestId: payload.requestId as Id<"borrowRequests">,
      idempotencyKey: payload.idempotencyKey,
      status: payload.status,
      detail: payload.detail,
    });
    return jsonResponse({ ok: true });
  }),
});

export default http;
