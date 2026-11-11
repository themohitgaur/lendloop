import ToolListingsManager from "@/components/marketplace/ToolListingsManager";

export default function MyListingsPage() {
  return (
    <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Your sharing shelf
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900">
          My listings
        </h1>
        <p className="mt-3 max-w-xl leading-7 text-stone-600">
          Add, update, and manage the tools you&apos;re willing to lend.
        </p>
      </header>
      <ToolListingsManager />
    </div>
  );
}
