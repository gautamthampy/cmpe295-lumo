"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAuthStore } from "@/lib/store/auth";

export default function StudentLearnPage() {
  const router = useRouter();
  const displayName = useAuthStore((state) => state.displayName);
  const role = useAuthStore((state) => state.role);
  const logout = useAuthStore((state) => state.logout);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) {
      return;
    }

    if (role !== "student" || !isAuthenticated()) {
      router.replace("/student-login");
    }
  }, [isAuthenticated, ready, role, router]);

  if (!ready || role !== "student" || !isAuthenticated()) {
    return <main className="min-h-screen bg-surface-container-low" />;
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#fffadf_0%,#ffdeac_52%,#cae6ff_100%)] px-6 py-12">
      <div className="mx-auto flex max-w-4xl flex-col gap-6">
        <section className="rounded-[2rem] bg-white/90 p-8 shadow-[0_28px_80px_-24px_rgba(126,87,0,0.24)] backdrop-blur-sm">
          <p className="font-['Plus_Jakarta_Sans'] text-sm font-bold uppercase tracking-[0.3em] text-[#857556]">Student Session Active</p>
          <h1 className="mt-3 font-['Plus_Jakarta_Sans'] text-5xl font-extrabold tracking-[-0.05em] text-[#7e5700]">Hi, {displayName ?? "Learner"}!</h1>
          <p className="mt-4 max-w-2xl font-body text-lg leading-8 text-[#52452a]">
            Your secure student sign-in is now live. This route is ready to host the playful subject and topic library screens in the next slice without sending students back through the parent sign-in flow.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <button
              type="button"
              onClick={() => {
                logout();
                router.replace("/student-login");
              }}
              className="rounded-[1.5rem] bg-[#7e5700] px-5 py-3 font-['Plus_Jakarta_Sans'] text-sm font-bold text-white shadow-[0_14px_30px_rgba(126,87,0,0.24)] transition-transform hover:scale-[0.99]"
            >
              Sign Out
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
