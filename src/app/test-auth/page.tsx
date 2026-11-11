
        "use client";

        import {
        useUser,
        UserButton,
        SignInButton,
        } from "@clerk/nextjs";

        import { useConvexAuth, useQuery } from "convex/react";
        import { api } from "../../../convex/_generated/api";

        export default function TestAuthPage() {
        const { user, isLoaded, isSignedIn } = useUser();

        const {
            isLoading: convexLoading,
            isAuthenticated,
        } = useConvexAuth();
        const currentUser = useQuery(
            api.users.getCurrentUser,
            isAuthenticated ? {} : "skip"
            );
        const identity = useQuery(
            api.users.getCurrentIdentity,
            isAuthenticated ? {} : "skip"
        );

        if (!isLoaded || convexLoading) {
            return <p>Checking authentication...</p>;
        }

        return (
            <main className="p-10 space-y-5">
            <h1 className="text-2xl font-bold">
                LendLoop Authentication Test
            </h1>

            <div>
                <p>
                Clerk: {isSignedIn ? "Signed in" : "Signed out"}
                </p>
                <p>
                Convex: {isAuthenticated ? "Authenticated" : "Not authenticated"}
                </p>
            </div>

            {!isSignedIn && (
                <SignInButton mode="modal">
                <button className="rounded-lg bg-black px-5 py-2 text-white">
                    Sign in with Clerk
                </button>
                </SignInButton>
            )}

            {isSignedIn && (
                <div className="flex items-center gap-3">
                <p>Welcome, {user?.fullName}</p>
                <UserButton />
                </div>
            )}

            {isAuthenticated && identity === undefined && (
                <p>Verifying identity with Convex...</p>
            )}

            {isAuthenticated && identity && (
                <div className="border rounded-lg p-4 space-y-2">
                <h2 className="font-semibold">
                    Backend Verified Identity
                </h2>

                <p>Name: {identity.name}</p>
                <p>Email: {identity.email}</p>
                <p>Clerk ID: {identity.clerkId}</p>
                </div>
            )}{isAuthenticated && currentUser === undefined && (
  <p>Loading LendLoop profile...</p>
)}

{currentUser && (
  <div className="border rounded-lg p-4 space-y-2">
    <h2 className="font-semibold">
      LendLoop User Profile
    </h2>

    <p>Name: {currentUser.name}</p>
    <p>Email: {currentUser.email}</p>
    <p>Role: {currentUser.role}</p>
    <p>Profile ID: {currentUser.id}</p>
    <p>Clerk ID: {currentUser.clerkId}</p>
  </div>
)}
            </main>
        );
        }
