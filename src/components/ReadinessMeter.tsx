'use client';

import React, { useState } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ShieldCheck } from 'lucide-react';

interface ReadinessMeterProps {
  score: number;
  criticalBlockers?: string[];
  warnings?: string[];
  completedItems?: string[];
  submissionReady?: boolean;
  clearanceReady?: boolean;
}

export function ReadinessMeter({
  score,
  criticalBlockers = [],
  warnings = [],
  completedItems = [],
  submissionReady = false,
  clearanceReady = false,
}: ReadinessMeterProps) {
  const [expanded, setExpanded] = useState(false);

  const getScoreColor = (val: number) => {
    if (val >= 80) return 'text-emerald-400 bg-emerald-500';
    if (val >= 50) return 'text-amber-400 bg-amber-500';
    return 'text-rose-400 bg-rose-500';
  };

  const colorClasses = getScoreColor(score);
  const textColor = colorClasses.split(' ')[0];
  const barColor = colorClasses.split(' ')[1];

  return (
    <div className="bg-[#12151B] border border-[#1F2430] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-300">
            Release Health & Readiness
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-base font-bold font-mono ${textColor}`}>{score}%</span>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-zinc-400 hover:text-zinc-200 p-0.5 rounded transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-[#1A1F2B] rounded-full overflow-hidden">
        <div
          className={`h-full transition-all duration-500 rounded-full ${barColor}`}
          style={{ width: `${Math.max(5, score)}%` }}
        />
      </div>

      {/* High-level status flags */}
      <div className="flex flex-wrap gap-2 pt-1 text-[11px]">
        <span
          className={`px-2 py-0.5 rounded font-medium border ${
            submissionReady
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
              : 'bg-rose-950/60 text-rose-300 border-rose-800/40'
          }`}
        >
          {submissionReady ? '✓ Submission Ready' : '✗ Submission Blocked'}
        </span>
        <span
          className={`px-2 py-0.5 rounded font-medium border ${
            clearanceReady
              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40'
              : 'bg-amber-950/60 text-amber-300 border-amber-800/40'
          }`}
        >
          {clearanceReady ? '✓ Rights Assessed' : '⚠ Clearances Pending'}
        </span>
      </div>

      {/* Expanded Breakdown */}
      {expanded && (
        <div className="space-y-3 pt-3 border-t border-[#1F2430] text-xs">
          {criticalBlockers.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-rose-400 flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Critical Blockers ({criticalBlockers.length})</span>
              </span>
              <ul className="space-y-1 pl-4 text-zinc-300 list-disc">
                {criticalBlockers.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-amber-400 flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Advisories & Pending Items ({warnings.length})</span>
              </span>
              <ul className="space-y-1 pl-4 text-zinc-400 list-disc">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {completedItems.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Milestones ({completedItems.length})</span>
              </span>
              <ul className="space-y-1 pl-4 text-zinc-400 list-disc">
                {completedItems.slice(0, 5).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
                {completedItems.length > 5 && (
                  <li className="text-zinc-500 italic">+{completedItems.length - 5} more items verified</li>
                )}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-zinc-500 pt-2 border-t border-[#1F2430]">
            Note: A 100% readiness score reflects completed submission data and does not constitute formal legal clearance or guaranteed approval by PHD Services.
          </p>
        </div>
      )}
    </div>
  );
}

