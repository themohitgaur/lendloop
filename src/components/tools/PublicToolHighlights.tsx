"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { ArrowUpRight, Wrench } from "lucide-react";
import { api } from "../../../convex/_generated/api";

export default function PublicToolHighlights() {
  const tools = useQuery(api.tools.listPublicTools, { availableOnly: true });

  if (tools === undefined) {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {[0, 1, 2].map((item) => (
          <div
            key={item}
            className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5"
          />
        ))}
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="rounded-2xl border border-white/15 bg-white/5 p-5 text-sm leading-6 text-emerald-50/80">
        No tools have been listed yet. Be the first to share something useful
        with your neighborhood.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {tools.slice(0, 3).map((tool) => (
        <Link
          href="/tools"
          key={tool.id}
          className="group rounded-2xl border border-white/15 bg-white/5 p-4 transition hover:bg-white/10"
        >
          <span className="mb-5 flex size-9 items-center justify-center rounded-xl bg-white/10 text-emerald-100">
            <Wrench size={17} aria-hidden="true" />
          </span>
          <span className="flex items-center justify-between gap-2">
            <span>
              <span className="block font-semibold text-white">{tool.name}</span>
              <span className="mt-1 block text-xs text-emerald-100/70">
                {tool.category}
              </span>
            </span>
            <ArrowUpRight
              size={16}
              className="text-emerald-100/60 transition group-hover:-translate-y-0.5 group-hover:translate-x-0.5"
              aria-hidden="true"
            />
          </span>
        </Link>
      ))}
    </div>
  );
}
