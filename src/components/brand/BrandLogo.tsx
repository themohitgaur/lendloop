import Link from "next/link";
import { Repeat2 } from "lucide-react";

export default function BrandLogo() {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5">
      <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-700 text-emerald-50 shadow-sm">
        <Repeat2 aria-hidden="true" size={21} strokeWidth={2.2} />
      </span>
      <span className="text-lg font-semibold tracking-tight text-stone-900">
        Lend<span className="text-emerald-700">Loop</span>
      </span>
    </Link>
  );
}
