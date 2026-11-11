"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { Filter, ShieldCheck, Wrench } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import BorrowRequestForm from "@/components/tools/BorrowRequestForm";

export default function ToolsCatalogue() {
  const [category, setCategory] = useState("all");
  const tools = useQuery(api.tools.listPublicTools, {
    ...(category === "all" ? {} : { category }),
  });
  const { isSignedIn } = useUser();
  const categories = useMemo(
    () => [...new Set(tools?.map((tool) => tool.category) ?? [])].sort(),
    [tools],
  );

  return (
    <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex flex-col gap-6 border-b border-stone-200 pb-8 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Share a little more
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900 sm:text-5xl">
            The neighborhood shelf
          </h1>
          <p className="mt-3 max-w-xl leading-7 text-stone-600">
            Browse local tools by category. Listing details are public; owner
            contact information stays private.
          </p>
        </div>
        <label className="flex min-w-52 items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-sm text-stone-600 shadow-sm">
          <Filter size={17} className="text-emerald-800" aria-hidden="true" />
          <span className="sr-only">Filter tools by category</span>
          <select
            className="w-full bg-transparent font-medium text-stone-800 outline-none"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((option) => (
              <option value={option} key={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      {tools === undefined ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-72 animate-pulse rounded-3xl border border-stone-200 bg-white"
            />
          ))}
        </div>
      ) : tools.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
            <Wrench size={22} aria-hidden="true" />
          </span>
          <h2 className="mt-4 text-xl font-semibold text-stone-900">
            Nothing on the shelf just yet
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-600">
            {category === "all"
              ? "When neighbors list tools, they’ll show up here."
              : `No tools are listed in ${category} yet.`}
          </p>
          <Link
            href={isSignedIn ? "/my-listings" : "/sign-up"}
            className="mt-5 inline-flex rounded-full bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900"
          >
            Lend a tool
          </Link>
        </div>
      ) : (
        <section className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <article
              key={tool.id}
              className="flex flex-col rounded-3xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-stone-300 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
                  {tool.category}
                </span>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    tool.isAvailable
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-amber-50 text-amber-800"
                  }`}
                >
                  {tool.isAvailable ? "Available" : "On loan"}
                </span>
              </div>
              <div className="mt-6 flex size-12 items-center justify-center rounded-2xl bg-[#f3f1e9] text-emerald-800">
                <Wrench size={21} aria-hidden="true" />
              </div>
              <h2 className="mt-4 text-xl font-semibold tracking-tight text-stone-900">
                {tool.name}
              </h2>
              <p className="mt-2 line-clamp-3 min-h-[4.5rem] text-sm leading-6 text-stone-600">
                {tool.description}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-stone-500">
                <span className="rounded-full border border-stone-200 px-2.5 py-1 capitalize">
                  {tool.condition} condition
                </span>
                {tool.isTrustedLender && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-800">
                    <ShieldCheck size={13} aria-hidden="true" />
                    Trusted lender
                  </span>
                )}
              </div>
              <div className="mt-auto pt-6">
                {tool.isOwnedByViewer ? (
                  <p className="rounded-full bg-stone-100 px-4 py-2.5 text-center text-sm font-medium text-stone-600">
                    Your listing
                  </p>
                ) : isSignedIn ? (
                  <BorrowRequestForm
                    toolId={tool.id}
                    toolName={tool.name}
                    isAvailable={tool.isAvailable}
                  />
                ) : (
                  <Link
                    href="/sign-in"
                    className="block rounded-full border border-stone-300 px-4 py-2.5 text-center text-sm font-semibold text-stone-800 transition hover:border-emerald-800 hover:text-emerald-800"
                  >
                    Sign in to borrow
                  </Link>
                )}
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
