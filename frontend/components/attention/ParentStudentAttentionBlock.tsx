'use client';

import Link from 'next/link';

import AttentionInsightPanels from '@/components/attention/AttentionInsightPanels';

type Props = {
  studentId: string;
  studentName: string;
};

export default function ParentStudentAttentionBlock({ studentId, studentName }: Props) {
  return (
    <div className="mt-5 rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
      <p className="font-headline text-sm font-bold text-slate-800">Focus &amp; attention</p>
      <p className="mt-1 font-body text-xs leading-5 text-slate-600">
        Trend and heatmap for <span className="font-semibold text-slate-800">{studentName}</span>.
      </p>
      <div className="mt-3 max-h-[420px] overflow-y-auto pr-1">
        <AttentionInsightPanels userId={studentId} compact />
      </div>
      <Link
        href={`/dashboard/attention?student_id=${encodeURIComponent(studentId)}`}
        className="mt-4 inline-flex font-label text-sm font-semibold text-violet-700 hover:text-violet-900"
      >
        Open full focus dashboard →
      </Link>
    </div>
  );
}
