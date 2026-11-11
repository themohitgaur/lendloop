import Link from "next/link";
import BrandLogo from "@/components/brand/BrandLogo";

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-stone-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <div>
          <BrandLogo />
          <p className="mt-2 text-sm text-stone-500">
            Borrow what you need. Lend what you don&apos;t.
          </p>
        </div>
        <div className="flex gap-5 text-sm text-stone-600">
          <Link className="transition hover:text-emerald-800" href="/tools">
            Explore tools
          </Link>
          <Link className="transition hover:text-emerald-800" href="/sign-up">
            Join the neighborhood
          </Link>
        </div>
      </div>
    </footer>
  );
}
