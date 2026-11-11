import { IncomingRequestsList } from "@/components/marketplace/RequestsList";

export default function IncomingRequestsPage() {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-800">
          Lending
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight text-stone-900">
          Incoming requests
        </h1>
        <p className="mt-3 max-w-xl leading-7 text-stone-600">
          Review borrowing requests for your tools and follow active loans
          through their return.
        </p>
      </header>
      <IncomingRequestsList />
    </div>
  );
}
