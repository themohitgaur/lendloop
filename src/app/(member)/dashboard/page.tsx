"use client";

import Link from "next/link";
import { useConvexAuth, useQuery } from "convex/react";
import {
  ArrowRight,
  ArrowUpRight,
  ClipboardList,
  HandHeart,
  PackageOpen,
  Wrench,
} from "lucide-react";
import { api } from "../../../../convex/_generated/api";

const shortcuts = [
  {
    href: "/my-listings",
    label: "List a tool",
    detail: "Share something useful with a neighbor.",
    icon: Wrench,
  },
  {
    href: "/tools",
    label: "Explore tools",
    detail: "Find what you need for your next project.",
    icon: PackageOpen,
  },
  {
    href: "/incoming-requests",
    label: "Review requests",
    detail: "Respond to neighbors borrowing your tools.",
    icon: ClipboardList,
  },
];

export default function DashboardPage() {
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const stats = useQuery(
    api.requests.getDashboardStats,
    isAuthenticated ? {} : "skip",
  );

  const metrics = [
    { label: "Active listings", value: stats?.activeListings, icon: Wrench },
    {
      label: "My open requests",
      value: stats?.myOpenRequests,
      icon: ClipboardList,
    },
    {
      label: "Incoming requests",
      value: stats?.incomingRequests,
      icon: HandHeart,
    },
    { label: "Active loans", value: stats?.activeLoans, icon: PackageOpen },
  ];

  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Your neighborhood shelf
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            {currentUser?.name
              ? `Good to see you, ${currentUser.name.split(" ")[0]}.`
              : "Your dashboard"}
          </h1>
          <p className="mt-3 max-w-xl leading-7 text-stone-600">
            Keep your listings, requests, and active loans moving smoothly.
          </p>
        </div>
        <Link
          href="/my-listings"
          className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-800 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-900 sm:self-auto"
        >
          Share a tool <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </div>

      <section
        aria-label="Your marketplace statistics"
        className="mt-9 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"
      >
        {metrics.map(({ label, value, icon: Icon }) => (
          <article
            key={label}
            className="rounded-2xl border border-stone-200 bg-white p-5"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-stone-500">{label}</span>
              <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-800">
                <Icon size={17} aria-hidden="true" />
              </span>
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-tight text-stone-900">
              {value ?? "—"}
            </p>
          </article>
        ))}
      </section>

      <section className="mt-12">
        <div className="flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              Pick up where you left off
            </h2>
            <p className="mt-1 text-sm text-stone-500">
              Your next step is only a click away.
            </p>
          </div>
          <Link
            href="/my-requests"
            className="hidden items-center gap-1 text-sm font-semibold text-emerald-800 sm:inline-flex"
          >
            View requests <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {shortcuts.map(({ href, label, detail, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="group rounded-3xl border border-stone-200 bg-white p-6 transition hover:-translate-y-0.5 hover:border-emerald-200 hover:shadow-md"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-[#f3f1e9] text-emerald-800">
                <Icon size={20} aria-hidden="true" />
              </span>
              <h3 className="mt-5 font-semibold text-stone-900">{label}</h3>
              <p className="mt-2 text-sm leading-6 text-stone-600">{detail}</p>
              <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-emerald-800">
                Open <ArrowRight size={15} className="transition group-hover:translate-x-1" aria-hidden="true" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {stats?.activeLoans === 0 && (
        <div className="mt-10 rounded-3xl border border-emerald-100 bg-emerald-50/70 p-6 sm:flex sm:items-center sm:justify-between">
          <div>
            <h2 className="font-semibold text-emerald-950">
              Your sharing loop starts nearby
            </h2>
            <p className="mt-1 text-sm leading-6 text-emerald-900/70">
              Browse available tools or list one you&apos;re happy to lend.
            </p>
          </div>
          <Link
            href="/tools"
            className="mt-4 inline-flex rounded-full border border-emerald-800/20 px-4 py-2 text-sm font-semibold text-emerald-900 sm:mt-0"
          >
            Browse tools
          </Link>
        </div>
      )}
    </div>
  );
}
