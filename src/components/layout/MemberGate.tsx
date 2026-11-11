"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useConvexAuth, useQuery } from "convex/react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import SiteFooter from "@/components/layout/SiteFooter";
import SiteNavbar from "@/components/layout/SiteNavbar";

export default function MemberGate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isLoaded, isSignedIn } = useUser();
  const { isLoading: convexLoading, isAuthenticated } = useConvexAuth();
  const currentUser = useQuery(
    api.users.getCurrentUser,
    isAuthenticated ? {} : "skip",
  );
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace(`/sign-in?redirect_url=${encodeURIComponent(pathname)}`);
    }
  }, [isLoaded, isSignedIn, pathname, router]);

  if (
    !isLoaded ||
    !isSignedIn ||
    convexLoading ||
    !isAuthenticated ||
    currentUser === undefined ||
    currentUser === null
  ) {
    return (
      <main className="flex min-h-[50vh] items-center justify-center px-6">
        <p className="text-sm text-stone-500">
          {!isLoaded || convexLoading
            ? "Checking your LendLoop session…"
            : "Preparing your LendLoop member profile…"}
        </p>
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-[#faf9f6] text-stone-900">
      <SiteNavbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}
