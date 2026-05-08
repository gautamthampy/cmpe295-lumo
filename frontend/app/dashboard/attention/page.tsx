'use client';

import { Suspense, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';

import MiniTestPanel from '@/components/attention/MiniTestPanel';
import SelfReportPanel from '@/components/attention/SelfReportPanel';
import AttentionInsightPanels from '@/components/attention/AttentionInsightPanels';
import { useAuthStore } from '@/lib/store/auth';

const DEFAULT_USER_ID = '11111111-1111-1111-1111-111111111111';
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

function AttentionDashboardContent() {
  const searchParams = useSearchParams();
  const authUserId = useAuthStore((s) => s.userId);
  const syncFromBrowserStorage = useAuthStore((s) => s.syncFromBrowserStorage);

  useEffect(() => {
    syncFromBrowserStorage();
  }, [syncFromBrowserStorage]);

  const effectiveUserId = useMemo(() => {
    const q = searchParams.get('student_id');
    if (isUuid(q)) return q;
    if (isUuid(authUserId)) return authUserId;
    return DEFAULT_USER_ID;
  }, [searchParams, authUserId]);

  const viewingLabel =
    isUuid(searchParams.get('student_id')) && searchParams.get('student_id') !== authUserId
      ? 'Viewing learner selected via URL (parent/tutor view).'
      : null;

  return (
    <>
      <header className="bg-white rounded-[1.75rem] w-full mb-5 p-5 px-8 shadow-sm border-2 border-violet-50">
        <h1 className="text-2xl font-black">
          <span className="text-gradient">Focus & Attention</span> 📈
        </h1>
        <p className="text-slate-500 text-sm mt-0.5">
          Attention trend and when this learner focuses best (hour × weekday).
        </p>
        {viewingLabel ? <p className="text-violet-600 text-xs mt-2 font-medium">{viewingLabel}</p> : null}
      </header>

      <div className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <MiniTestPanel userId={effectiveUserId} />
          <SelfReportPanel userId={effectiveUserId} />
        </div>

        <AttentionInsightPanels userId={effectiveUserId} />
      </div>
    </>
  );
}

export default function AttentionDashboardPage() {
  return (
    <Suspense
      fallback={
        <p className="text-slate-400 text-center py-12" role="status">
          Loading…
        </p>
      }
    >
      <AttentionDashboardContent />
    </Suspense>
  );
}
