import Link from "next/link";
import { ArrowRight, Handshake, Leaf, ShieldCheck } from "lucide-react";
import PublicToolHighlights from "@/components/tools/PublicToolHighlights";

const principles = [
  {
    icon: Handshake,
    title: "Neighbors helping neighbors",
    description:
      "Share useful things locally, meet the people around you, and make borrowing feel personal.",
  },
  {
    icon: Leaf,
    title: "Use more. Buy less.",
    description:
      "Get the right tool for the job without adding another rarely used item to the shed.",
  },
  {
    icon: ShieldCheck,
    title: "Clear, accountable handoffs",
    description:
      "Every request has a date range and a simple status, so both sides know what comes next.",
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden bg-[#143e32] text-white">
        <div className="pointer-events-none absolute -right-36 -top-40 size-[30rem] rounded-full border border-white/10" />
        <div className="pointer-events-none absolute -right-16 -top-20 size-[22rem] rounded-full border border-white/10" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-24 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-16 lg:py-28">
          <div>
            <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100">
              <span className="size-1.5 rounded-full bg-emerald-300" />
              A little more neighborly
            </p>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-6xl lg:text-7xl">
              Good tools.
              <br />
              Better neighbors.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-emerald-50/80 sm:text-lg sm:leading-8">
              Borrow what you need. Lend what you don&apos;t. LendLoop makes it
              easy to share the useful things already living in your
              neighborhood.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href="/tools"
                className="inline-flex items-center gap-2 rounded-full bg-[#d2e7ca] px-5 py-3 text-sm font-semibold text-[#163e32] transition hover:bg-white"
              >
                Explore available tools <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex items-center rounded-full border border-white/25 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                Sign in to lend or borrow
              </Link>
            </div>
            <p className="mt-5 text-xs text-emerald-100/60">
              A neighborhood tool-lending board, built around trust and reuse.
            </p>
          </div>

          <div className="rounded-[2rem] border border-white/15 bg-white/[0.06] p-5 shadow-2xl shadow-black/10 backdrop-blur sm:p-7">
            <div className="mb-5 flex items-end justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/70">
                  From your community
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight">
                  Ready to borrow
                </h2>
              </div>
              <Link
                href="/tools"
                className="text-sm font-medium text-emerald-100 transition hover:text-white"
              >
                View all
              </Link>
            </div>
            <PublicToolHighlights />
            <p className="mt-5 border-t border-white/10 pt-4 text-xs leading-5 text-emerald-100/60">
              Public listings show only tool details. Owners&apos; contact and
              profile information stay private.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
            Sharing made simple
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-stone-900 sm:text-4xl">
            More making. Less buying.
          </h2>
          <p className="mt-4 leading-7 text-stone-600">
            From a weekend project to a garden refresh, the right tool might be
            just around the corner.
          </p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {principles.map(({ icon: Icon, title, description }, index) => (
            <article
              key={title}
              className="rounded-3xl border border-stone-200 bg-white p-6 sm:p-7"
            >
              <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
                <Icon size={20} aria-hidden="true" />
              </span>
              <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-stone-400">
                0{index + 1}
              </p>
              <h3 className="mt-2 text-lg font-semibold text-stone-900">
                {title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-stone-600">
                {description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
