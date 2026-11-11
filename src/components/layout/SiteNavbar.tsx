"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUser, UserButton } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { Menu, X } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import BrandLogo from "@/components/brand/BrandLogo";

const memberLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/tools", label: "Explore tools" },
  { href: "/my-listings", label: "My listings" },
  { href: "/my-requests", label: "My requests" },
  { href: "/incoming-requests", label: "Incoming requests" },
];

export default function SiteNavbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();
  const { isLoaded, isSignedIn } = useUser();
  const { isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const links = isSignedIn
    ? [
        ...memberLinks,
        ...(currentUser?.role === "admin"
          ? [{ href: "/admin", label: "Admin" }]
          : []),
      ]
    : [{ href: "/tools", label: "Explore tools" }];

  function linkClass(href: string) {
    const active =
      pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
    return `rounded-full px-3 py-2 text-sm font-medium transition ${
      active
        ? "bg-emerald-50 text-emerald-800"
        : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
    }`;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-stone-200/80 bg-[#faf9f6]/95 backdrop-blur">
      <div className="mx-auto flex min-h-18 max-w-7xl items-center justify-between gap-6 px-5 sm:px-8">
        <BrandLogo />

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main navigation">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className={linkClass(link.href)}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {isLoaded && isSignedIn ? (
            <UserButton />
          ) : isLoaded ? (
            <>
              <Link
                href="/sign-in"
                className="px-3 py-2 text-sm font-medium text-stone-700 transition hover:text-stone-950"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="rounded-full bg-emerald-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-900"
              >
                Join LendLoop
              </Link>
            </>
          ) : null}
        </div>

        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full border border-stone-200 text-stone-700 lg:hidden"
          aria-label={menuOpen ? "Close menu" : "Open menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {menuOpen && (
        <div className="border-t border-stone-200 bg-[#faf9f6] px-5 py-4 xl:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1" aria-label="Mobile navigation">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={linkClass(link.href)}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
            {isLoaded && !isSignedIn && (
              <div className="mt-3 flex gap-3 border-t border-stone-200 pt-4">
                <Link
                  href="/sign-in"
                  className="flex-1 rounded-full border border-stone-300 px-4 py-2.5 text-center text-sm font-medium text-stone-800"
                >
                  Sign in
                </Link>
                <Link
                  href="/sign-up"
                  className="flex-1 rounded-full bg-emerald-800 px-4 py-2.5 text-center text-sm font-semibold text-white"
                >
                  Join LendLoop
                </Link>
              </div>
            )}
            {isLoaded && isSignedIn && (
              <div className="mt-3 border-t border-stone-200 pt-4">
                <UserButton />
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
