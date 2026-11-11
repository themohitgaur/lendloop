
"use client";

import { useEffect } from "react";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function UserSync() {
  const { isLoading, isAuthenticated } = useConvexAuth();

  const syncUser = useMutation(
    api.users.getOrCreateCurrentUser
  );

  useEffect(() => {
    if (isLoading || !isAuthenticated) return;

    syncUser({})
      .then((userId) => {
        console.log("LendLoop user synchronised:", userId);
      })
      .catch((error) => {
        console.error("User synchronisation failed:", error);
      });
  }, [isLoading, isAuthenticated, syncUser]);

  return null;
}
