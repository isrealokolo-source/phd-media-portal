'use client';

import React from 'react';
import {
  FileEdit,
  Send,
  Search,
  CheckCircle2,
  AlertTriangle,
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
        ? onHoldReason || 'Pending clearance'
        : 'Schedules inspection & verification',
      icon: isRevision ? AlertTriangle : isOnHold ? PauseCircle : Search,
      date: isRevision ? 'Action Required' : undefined,
      isCompleted: isExecuted,
      isCurrent: isSubmitted || isRevision || isOnHold,
      isWarning: isRevision || isOnHold,
    },
    {
      id: 'executed',
      label: 'Executed & Cleared',
      desc: 'Countersigned & released to DSPs',
      icon: CheckCircle2,
      date: executedAt ? new Date(executedAt).toLocaleDateString('en-GB') : undefined,
      isCompleted: isExecuted,
      isCurrent: false,
    },
  ];

  return (
    <div className="p-5 rounded-lg bg-white border border-[#E8E8E8] space-y-4 shadow-sm select-none">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-[#777777]">
            Lifecycle Milestones
          </span>
          <h3 className="text-xs font-semibold text-[#171717] mt-0.5">Statutory Distribution Pipeline</h3>
        </div>

        <span
          className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded border ${
            isExecuted
              ? 'bg-[#ECFDF5] text-[#269568] border-[#A7F3D0]'
              : isRevision
              ? 'bg-[#FFFBEB] text-[#D69E36] border-[#FDE68A]'
              : isSubmitted
              ? 'bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]'
              : 'bg-[#F4F4F2] text-[#777777] border-[#E8E8E8]'
          }`}
        >
          {status.replace(/_/g, ' ')}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div key={step.id} className="relative flex flex-col justify-between space-y-2 p-3 rounded-md bg-[#F4F4F2] border border-[#E8E8E8]">
              <div className="flex items-center justify-between">
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center text-xs ${
                    step.isCompleted
                      ? 'bg-[#171717] text-white'
                      : step.isWarning
                      ? 'bg-[#FFFBEB] text-[#D69E36] border border-[#FDE68A]'
                      : step.isCurrent
                      ? 'bg-white text-[#171717] border border-[#171717]'
                      : 'bg-white text-[#999999] border border-[#E8E8E8]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                {step.date && (
                  <span className="text-[10px] font-mono text-[#777777]">{step.date}</span>
                )}
              </div>

              <div>
                <h4 className="text-xs font-semibold text-[#171717]">{step.label}</h4>
                <p className="text-[11px] text-[#777777] mt-0.5 leading-snug">{step.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
