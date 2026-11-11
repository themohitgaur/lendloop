"use client";

import { useState } from "react";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { Check, Shield, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";

function date(timestamp: number) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(timestamp);
}

export default function AdminPage() {
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const isAdmin = currentUser?.role === "admin";
  const tools = useQuery(api.tools.listAdminTools, isAdmin ? {} : "skip");
  const loans = useQuery(api.requests.listAdminLoans, isAdmin ? {} : "skip");
  const lenders = useQuery(api.requests.listAdminLenders, isAdmin ? {} : "skip");
  const removeTool = useMutation(api.tools.remove);
  const trustLender = useMutation(api.requests.setTrustedLender);
  const [message, setMessage] = useState("");

  async function remove(toolId: Id<"tools">) {
    setMessage("");
    try {
      await removeTool({ toolId });
      setMessage("Listing removed from the public catalogue.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not remove listing.");
    }
  }

  async function setTrusted(userId: Id<"users">, isTrustedLender: boolean) {
    setMessage("");
    try {
      await trustLender({ userId, isTrustedLender });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update lender status.");
    }
  }

  if (!isAuthenticated || currentUser === undefined) {
    return (
      <div className="mx-auto max-w-7xl px-5 py-16 text-sm text-stone-500 sm:px-8">
        Loading administrator access…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-20 text-center sm:px-8">
        <Shield className="mx-auto text-stone-400" size={28} aria-hidden="true" />
        <h1 className="mt-4 text-2xl font-semibold text-stone-900">Admin access required</h1>
        <p className="mt-2 text-sm text-stone-600">
          Administrator access is assigned on the Convex backend.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
          LendLoop operations
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900">
          Admin
        </h1>
        <p className="mt-3 max-w-xl leading-7 text-stone-600">
          Manage listings, review loans, and recognize trusted lenders.
        </p>
      </header>

      {message && (
        <p role="status" className="mb-6 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900">
          {message}
        </p>
      )}

      <section className="grid gap-8 xl:grid-cols-2">
        <div className="rounded-3xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-stone-900">All listings</h2>
          <p className="mt-1 text-sm text-stone-500">Remove any listing from public view.</p>
          <div className="mt-5 divide-y divide-stone-100">
            {tools?.map((tool) => (
              <div key={tool._id} className="flex items-center justify-between gap-4 py-4">
                <div className="min-w-0">
                  <p className="truncate font-medium text-stone-900">{tool.name}</p>
                  <p className="mt-1 text-xs text-stone-500">
                    {tool.category} · Listed by {tool.ownerName}
                  </p>
                </div>
                {tool.isListed ? (
                  <button
                    type="button"
                    onClick={() => void remove(tool._id)}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:border-red-300 hover:text-red-700"
                  >
                    <Trash2 size={14} aria-hidden="true" />
                    Remove
                  </button>
                ) : (
                  <span className="text-xs text-stone-400">Removed</span>
                )}
              </div>
            ))}
            {tools?.length === 0 && (
              <p className="py-8 text-sm text-stone-500">No listings yet.</p>
            )}
          </div>
        </div>

        <div className="rounded-3xl border border-stone-200 bg-white p-6">
          <h2 className="text-xl font-semibold text-stone-900">Trusted lenders</h2>
          <p className="mt-1 text-sm text-stone-500">
            This status is assigned by an administrator.
          </p>
          <div className="mt-5 divide-y divide-stone-100">
            {lenders?.map((lender) => (
              <div key={lender.id} className="flex items-center justify-between gap-4 py-4">
                <div>
                  <p className="font-medium text-stone-900">{lender.name}</p>
                  {lender.isTrustedLender && (
                    <span className="mt-1 inline-flex items-center gap-1 text-xs text-emerald-800">
                      <ShieldCheck size={13} aria-hidden="true" />
                      Trusted lender
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    void setTrusted(lender.id, !lender.isTrustedLender)
                  }
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 hover:border-emerald-700 hover:text-emerald-800"
                >
                  {lender.isTrustedLender ? (
                    <>
                      <Check size={14} aria-hidden="true" /> Trusted
                    </>
                  ) : (
                    "Mark trusted"
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-8 rounded-3xl border border-stone-200 bg-white p-6">
        <h2 className="text-xl font-semibold text-stone-900">Loans</h2>
        <p className="mt-1 text-sm text-stone-500">Active and returned loans across LendLoop.</p>
        {loans === undefined ? (
          <div className="mt-5 h-24 animate-pulse rounded-2xl bg-stone-50" />
        ) : loans.length === 0 ? (
          <p className="mt-5 rounded-2xl bg-stone-50 p-5 text-sm text-stone-500">
            There are no loans yet.
          </p>
        ) : (
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="border-b border-stone-200 text-xs uppercase tracking-wide text-stone-500">
                <tr>
                  <th className="pb-3 pr-4 font-medium">Tool</th>
                  <th className="pb-3 pr-4 font-medium">Borrower</th>
                  <th className="pb-3 pr-4 font-medium">Lender</th>
                  <th className="pb-3 pr-4 font-medium">Due</th>
                  <th className="pb-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {loans.map((loan) => (
                  <tr key={loan._id}>
                    <td className="py-3 pr-4 font-medium text-stone-900">{loan.toolName}</td>
                    <td className="py-3 pr-4 text-stone-600">{loan.borrowerName}</td>
                    <td className="py-3 pr-4 text-stone-600">{loan.lenderName}</td>
                    <td className="py-3 pr-4 text-stone-600">{date(loan.endAt)}</td>
                    <td className="py-3 capitalize text-stone-600">{loan.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
