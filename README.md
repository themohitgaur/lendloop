# LendLoop

Borrow what you need. Lend what you don't.

LendLoop is a neighborhood tool-lending board built with Next.js App Router,
Clerk, Convex, Tailwind CSS, Lucide React, and n8n. The public catalogue is
read-only; signed-in members can list tools, request date ranges, respond to
requests, and track returns.

## Local setup

### 1. Configure the app and Convex

Install dependencies. If `.env.local` does not already exist, copy the app
environment template; otherwise keep your current file and merge only any
missing keys from the template:

```bash
npm install
# Only for a new environment with no existing .env.local:
cp .env.example .env.local
```

Set the Clerk and Convex values in `.env.local`. Keep existing Clerk keys
private. `CLERK_JWT_ISSUER_DOMAIN` is configured on the Convex deployment:

```bash
npx convex env set CLERK_JWT_ISSUER_DOMAIN <clerk-jwt-issuer-domain>
npx convex dev
```

`npx convex dev` publishes the schema and functions to the selected development
deployment. The existing Clerk-to-Convex provider and user-sync mutation create
profiles with the `user` role. To grant admin access for local testing, change
that user's `role` to `admin` in the Convex dashboard; there is deliberately no
client-side role promotion path.

Start Next.js in another terminal:

```bash
npm run dev
```

### 2. Run n8n locally

The request notification workflow needs an HTTPS URL reachable by the Convex
deployment. For local n8n, use a trusted HTTPS tunnel/reverse proxy and point it
at port `5678`; `localhost` alone cannot receive requests from hosted Convex.

```bash
# Only if .env.n8n does not already exist:
cp .env.n8n.example .env.n8n
# Set the tunnel URL, a strong random encryption key, a strong shared HMAC
# secret, and the Convex HTTP actions base URL in .env.n8n.
docker compose --env-file .env.n8n up -d
```

Open the n8n editor at `http://localhost:5678` and import all JSON files in
`n8n/workflows/`. Activate **LendLoop - Automation errors** first, then activate
the request notification and daily overdue workflows. The dependent workflow
exports reference the error workflow ID; if n8n assigns new IDs during import,
select the error workflow in each workflow's settings.

Set these variables in the Convex deployment, using the same HMAC secret as
n8n:

```bash
npx convex env set N8N_REQUEST_WEBHOOK_URL https://<public-n8n-host>/webhook/lendloop-request-notifications
npx convex env set LENDLOOP_HMAC_SECRET <strong-random-shared-secret>
```

`LENDLOOP_CONVEX_HTTP_URL` in `.env.n8n` is the deployment's Convex HTTP actions
base URL, usually the `*.convex.site` URL (not the `*.convex.cloud` client URL).
The workflows call `/n8n/overdue` and `/n8n/reminders` on that base URL.

The exported workflows target self-hosted n8n, where the dedicated Code nodes
read the HMAC key from the container environment. An n8n Cloud deployment needs
the equivalent secret storage supported by that plan and corresponding Code
node configuration; never paste the secret into workflow JSON or client code.

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_CONVEX_URL` | Next.js `.env.local` | Convex client endpoint |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Next.js `.env.local` | Convex HTTP actions base URL |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `CLERK_FRONTEND_API_URL` | Next.js `.env.local` | Existing Clerk configuration |
| `CLERK_JWT_ISSUER_DOMAIN` | Convex deployment | Verifies Clerk JWTs |
| `N8N_REQUEST_WEBHOOK_URL` | Convex deployment | Outbound signed request/status events |
| `LENDLOOP_HMAC_SECRET` | Convex and n8n | Shared HMAC key; use a high-entropy value and do not commit it |
| `N8N_PUBLIC_WEBHOOK_URL` | n8n container | Public HTTPS base used to form production webhook URLs |
| `N8N_ENCRYPTION_KEY` | n8n container | Encrypts stored n8n credentials |
| `LENDLOOP_CONVEX_HTTP_URL` | n8n container | Convex HTTP actions base URL |
| `GENERIC_TIMEZONE` | n8n container | Schedule timezone; defaults to UTC |

`.env.local`, `.env.n8n`, and other `.env*` files are ignored by Git. The
committed example files contain placeholders only.

## Architecture and data flow

- `src/app/(site)` contains the public homepage and catalogue. There is one `/`
  route; the create-next-app starter route has been removed.
- `src/app/(member)` contains Clerk-gated dashboard, listing, request, and admin
  pages. Shared brand, navigation, and footer components live under
  `src/components`.
- Convex `tools` and `borrowRequests` are the source of truth. An approved
  request represents an active loan; returning it changes its state to
  `returned` and restores listing availability.
- Removing a listing hides it from public view while preserving associated
  request and loan history. Owners must resolve pending requests and active
  loans before removing their listing.
- Public queries return tool fields and a non-identifying trusted-lender flag;
  they do not return owner IDs, email addresses, or private profile fields.
  The homepage itself displays only tool name and category.
- Dashboard counts and owner/borrower views are computed from Convex data, not
  placeholders. Empty states are shown when a member has no records.
- `requireCurrentUser` and `requireAdmin` enforce permissions in Convex
  functions. The UI's role-based navigation is only presentation; it is not an
  authorization boundary. Admins can remove any listing, inspect active and
  returned loans, and mark lenders trusted. Admin assignment remains an
  operator action in the Convex dashboard.

## n8n automation and security

1. **Request notifications:** Convex writes a minimal outbox event and schedules
   an internal action. The action signs the JSON body with HMAC-SHA256 and sends
   it to the n8n webhook. n8n checks the timestamp (five-minute replay window)
   and signature before logging a mock notification. The recipient email is
   included only in this private server-to-server notification payload.
   Convex stores attempts/status, retries with backoff, and marks exhausted
   delivery attempts failed.
2. **Overdue reminders:** the daily n8n workflow signs a request to the Convex
   `/n8n/overdue` HTTP action. Convex verifies the signature before returning
   only overdue-loan reminder fields. n8n logs a mock reminder and signs a
   status callback to `/n8n/reminders`; Convex verifies that signature and
   writes the result idempotently using a per-loan/per-day key.
3. **Errors:** both workflows reference the error workflow. Failed executions
   are visible in n8n and the error workflow logs minimized execution details.
   Failed reminder writebacks are retried by n8n; a failed writeback is not
   recorded as sent, so a later run can safely retry.

The exported workflows contain no credentials or real secret values. The
Compose configuration permits workflow Code nodes to read the dedicated HMAC
environment variable; run this n8n instance as a trusted service and do not
import untrusted workflows or grant untrusted users editor access.

## Production considerations

Before production, pin and regularly update the n8n image, use managed secret
storage and separate HMAC keys per environment, and run n8n behind HTTPS with
restricted editor access and persistent backups. Replace the mock notification
nodes with a real provider credential, add automated integration tests for
signature/retry/idempotency behavior, monitor Convex outbox failures and n8n
execution errors, and establish retention rules for request and automation
records. Add pagination and rate limiting as catalogue volume grows, and
provide an audited admin process for role assignment.
