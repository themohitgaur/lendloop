"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { Archive, Pencil, Plus, Trash2, Wrench } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";

const categories = [
  "Power tools",
  "Garden",
  "Kitchen",
  "Camping",
  "Cleaning",
  "Automotive",
  "Other",
];
const conditions = ["new", "good", "fair", "worn"] as const;
type Condition = (typeof conditions)[number];
type ListingDraft = {
  name: string;
  category: string;
  condition: Condition;
  description: string;
};

const emptyDraft: ListingDraft = {
  name: "",
  category: categories[0],
  condition: "good",
  description: "",
};

export default function ToolListingsManager() {
  const listings = useQuery(api.tools.listMyListings, {});
  const createListing = useMutation(api.tools.create);
  const updateListing = useMutation(api.tools.update);
  const removeListing = useMutation(api.tools.remove);
  const [draft, setDraft] = useState<ListingDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<Id<"tools"> | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  function startEditing(listing: NonNullable<typeof listings>[number]) {
    setEditingId(listing._id);
    setDraft({
      name: listing.name,
      category: listing.category,
      condition: listing.condition,
      description: listing.description,
    });
    setError("");
    setNotice("");
  }

  function resetForm() {
    setEditingId(null);
    setDraft(emptyDraft);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      if (editingId) {
        await updateListing({ toolId: editingId, ...draft });
        setNotice("Listing updated.");
      } else {
        await createListing(draft);
        setNotice("Your tool is now listed.");
      }
      resetForm();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not save your listing.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function remove(toolId: Id<"tools">) {
    setError("");
    setNotice("");
    try {
      await removeListing({ toolId });
      setNotice("Listing removed from the public catalogue.");
      if (editingId === toolId) resetForm();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Could not remove listing.",
      );
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <section className="h-fit rounded-3xl border border-stone-200 bg-white p-6 sm:p-7">
        <div className="flex items-start gap-3">
          <span className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-800">
            {editingId ? <Pencil size={18} /> : <Plus size={19} />}
          </span>
          <div>
            <h2 className="text-xl font-semibold text-stone-900">
              {editingId ? "Edit your listing" : "List a tool"}
            </h2>
            <p className="mt-1 text-sm leading-6 text-stone-500">
              Share the details neighbors need. Your contact information is never
              public.
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <label className="block text-sm font-medium text-stone-700">
            Tool name
            <input
              required
              maxLength={80}
              value={draft.name}
              onChange={(event) =>
                setDraft((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Cordless drill"
              className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm outline-none transition focus:border-emerald-700"
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-medium text-stone-700">
              Category
              <select
                value={draft.category}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    category: event.target.value,
                  }))
                }
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-emerald-700"
              >
                {categories.map((category) => (
                  <option value={category} key={category}>
                    {category}
                  </option>
                ))}
                {!categories.includes(draft.category) && (
                  <option value={draft.category}>{draft.category}</option>
                )}
              </select>
            </label>
            <label className="block text-sm font-medium text-stone-700">
              Condition
              <select
                value={draft.condition}
                onChange={(event) => {
                  const condition = conditions.find(
                    (option) => option === event.target.value,
                  );
                  if (condition) {
                    setDraft((current) => ({ ...current, condition }));
                  }
                }}
                className="mt-1.5 w-full rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm capitalize outline-none focus:border-emerald-700"
              >
                {conditions.map((condition) => (
                  <option value={condition} key={condition}>
                    {condition}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="block text-sm font-medium text-stone-700">
            Short description
            <textarea
              required
              maxLength={500}
              rows={4}
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="A few helpful details about the tool and what it’s best for."
              className="mt-1.5 w-full resize-y rounded-xl border border-stone-200 bg-white px-3.5 py-2.5 text-sm leading-6 outline-none transition focus:border-emerald-700"
            />
          </label>

          {error && (
            <p role="alert" className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          {notice && (
            <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {notice}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              disabled={saving}
              className="rounded-full bg-emerald-800 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900 disabled:opacity-50"
            >
              {saving ? "Saving…" : editingId ? "Save changes" : "Publish listing"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-full border border-stone-300 px-5 py-2.5 text-sm font-medium text-stone-700"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-stone-900">Your listings</h2>
            <p className="mt-1 text-sm text-stone-500">
              Tools you have shared with the neighborhood.
            </p>
          </div>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600">
            {listings?.filter((listing) => listing.isListed).length ?? "—"} active
          </span>
        </div>

        {listings === undefined ? (
          <div className="h-52 animate-pulse rounded-3xl border border-stone-200 bg-white" />
        ) : listings.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-5 py-12 text-center">
            <Wrench className="mx-auto text-stone-400" size={24} aria-hidden="true" />
            <p className="mt-3 font-medium text-stone-800">No listings yet</p>
            <p className="mt-1 text-sm text-stone-500">
              Your first shared tool will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {listings.map((listing) => (
              <article
                key={listing._id}
                className="flex flex-col gap-4 rounded-2xl border border-stone-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-stone-900">{listing.name}</h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        !listing.isListed
                          ? "bg-stone-100 text-stone-600"
                          : listing.isAvailable
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-amber-50 text-amber-800"
                      }`}
                    >
                      {!listing.isListed
                        ? "Removed"
                        : listing.isAvailable
                          ? "Available"
                          : "On loan"}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-stone-500">
                    {listing.category} · {listing.condition} condition
                  </p>
                </div>
                {listing.isListed && (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(listing)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 transition hover:border-emerald-700 hover:text-emerald-800"
                    >
                      <Pencil size={14} aria-hidden="true" />
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(listing._id)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-stone-300 px-3 py-2 text-xs font-semibold text-stone-700 transition hover:border-red-300 hover:text-red-700"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Remove
                    </button>
                  </div>
                )}
                {!listing.isListed && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-stone-400">
                    <Archive size={14} aria-hidden="true" />
                    Archived from catalogue
                  </span>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
