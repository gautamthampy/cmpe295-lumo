"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { authRequest, authRoutes, type AuthMessage } from "@/lib/auth";

export function PortalLogoutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);

    try {
      await authRequest<AuthMessage>(authRoutes.logout, {
        method: "POST",
      });
    } finally {
      router.replace("/sign-in");
      router.refresh();
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={pending}
      className="rounded-xl bg-gradient-to-br from-primary to-primary-container px-5 py-3 font-label font-semibold text-on-primary shadow-lg shadow-primary/20 disabled:opacity-60"
    >
      {pending ? "Signing out..." : "Sign out"}
    </button>
  );
}