'use client';

import React from 'react';
import {
  FileEdit,
  Send,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  PauseCircle,
} from 'lucide-react';

interface ReleaseTimelineProps {
  status: string;
  createdAt: string | Date;
  submittedAt?: string | Date | null;
  executedAt?: string | Date | null;
  onHoldReason?: string | null;
}

export function ReleaseTimeline({
  status,
  createdAt,
  submittedAt,
  executedAt,
  onHoldReason,
}: ReleaseTimelineProps) {
  const isDraft = status === 'DRAFT';
  const isSubmitted = status === 'SUBMITTED_PENDING_APPROVAL' || status === 'RESUBMITTED';
  const isRevision = status === 'REVISION_REQUESTED';
  const isOnHold = status === 'ON_HOLD';
  const isExecuted = status === 'FULLY_EXECUTED_APPROVED';

  // Determine active step index:
  // 0: Draft
  // 1: Submitted
  // 2: Review / QA
  // 3: Executed
  let activeIndex = 0;
  if (isSubmitted) activeIndex = 1;
  else if (isRevision || isOnHold) activeIndex = 2;
  else if (isExecuted) activeIndex = 3;

  const steps = [
    {
      id: 'draft',
      label: 'Draft Registration',
      desc: 'Metadata, tracks & Schedule A setup',
      icon: FileEdit,
      date: createdAt ? new Date(createdAt).toLocaleDateString('en-GB') : undefined,
      isCompleted: !isDraft,
      isCurrent: isDraft,
    },
    {
      id: 'submitted',
      label: 'Artist Submission',
      desc: 'Executed by artist & submitted',
      icon: Send,
      date: submittedAt ? new Date(submittedAt).toLocaleDateString('en-GB') : undefined,
      isCompleted: isRevision || isOnHold || isExecuted,
      isCurrent: isSubmitted,
    },
    {
      id: 'review',
      label: isRevision ? 'Revision Requested' : isOnHold ? 'Placed on Hold' : 'PHD Legal & QA Review',
      desc: isRevision
        ? 'Awaiting artist updates'
        : isOnHold
        ? onHoldReason || 'Pending label clearance'
        : 'Schedules inspection & verification',
      icon: isRevision ? AlertTriangle : isOnHold ? PauseCircle : Search,
      date: isRevision ? 'Action Required' : undefined,
      isCompleted: isExecuted,
      isCurrent: isSubmitted || isRevision || isOnHold,
      isWarning: isRevision || isOnHold,
    },
    {
      id: 'executed',
      label: 'Executed & Approved',
      desc: 'Countersigned & released to DSPs',
      icon: CheckCircle2,
      date: executedAt ? new Date(executedAt).toLocaleDateString('en-GB') : undefined,
      isCompleted: isExecuted,
      isCurrent: false,
    },
  ];

  return (
    <div className="p-5 rounded-2xl bg-[#12151B] border border-[#1F2430] space-y-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400">
            Release Lifecycle Status
          </span>
          <h3 className="text-sm font-bold text-white mt-0.5">Statutory Distribution Pipeline</h3>
        </div>

        <span
          className={`text-[10px] font-mono uppercase font-bold px-2.5 py-1 rounded-full border ${
            isExecuted
              ? 'bg-emerald-950/80 text-emerald-300 border-emerald-700/60'
              : isRevision
              ? 'bg-amber-950/80 text-amber-300 border-amber-700/60'
              : isOnHold
              ? 'bg-rose-950/80 text-rose-300 border-rose-700/60'
              : isSubmitted
              ? 'bg-indigo-950/80 text-indigo-300 border-indigo-700/60'
              : 'bg-zinc-800 text-zinc-300 border-zinc-700'
          }`}
        >
          ● {status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 pt-2">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          const isDone = s.isCompleted;
          const isCurr = s.isCurrent;
          const isWarn = s.isWarning;

          return (
            <div
              key={s.id}
              className={`p-3.5 rounded-xl border relative transition-all ${
                isDone
                  ? 'bg-emerald-950/20 border-emerald-900/50 text-zinc-200'
                  : isCurr && isWarn
                  ? 'bg-amber-950/30 border-amber-700/60 text-amber-200 shadow-md shadow-amber-950/40'
                  : isCurr
                  ? 'bg-indigo-950/40 border-indigo-600/60 text-white shadow-md shadow-indigo-950/40'
                  : 'bg-[#0E1015] border-[#1F2430] text-zinc-500'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isDone
                      ? 'bg-emerald-900/60 text-emerald-400 border border-emerald-700/50'
                      : isCurr && isWarn
                      ? 'bg-amber-900/60 text-amber-300 border border-amber-600'
                      : isCurr
                      ? 'bg-indigo-600 text-white'
                      : 'bg-[#181C25] text-zinc-500 border border-[#252C3D]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="text-[10px] font-mono text-zinc-400 font-bold">
                  STEP 0{idx + 1}
                </span>
              </div>

              <h4 className="text-xs font-bold text-zinc-100">{s.label}</h4>
              <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-2">{s.desc}</p>

              {s.date && (
                <div className="mt-2 pt-2 border-t border-[#1F2430]/60 flex items-center justify-between text-[10px] font-mono">
                  <span className="text-zinc-500">Date:</span>
                  <span
                    className={
                      isWarn ? 'text-amber-400 font-bold' : isDone ? 'text-emerald-400' : 'text-zinc-300'
                    }
                  >
                    {s.date}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
