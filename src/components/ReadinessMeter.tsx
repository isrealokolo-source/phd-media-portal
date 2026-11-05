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
    if (val >= 80) return { text: 'text-[#269568]', bar: 'bg-[#269568]' };
    if (val >= 50) return { text: 'text-[#D69E36]', bar: 'bg-[#D69E36]' };
    return { text: 'text-[#D64B4B]', bar: 'bg-[#D64B4B]' };
  };

  const { text: textColor, bar: barColor } = getScoreColor(score);

  return (
    <div className="bg-white border border-[#E8E8E8] rounded-lg p-4 space-y-3 shadow-sm select-none">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-[#171717]" />
          <span className="text-xs font-semibold uppercase tracking-wider text-[#171717]">
            Submission Health & Readiness
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-base font-bold font-mono ${textColor}`}>{score}%</span>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="text-[#777777] hover:text-[#171717] p-1 rounded transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-[#F4F4F2] rounded-full overflow-hidden border border-[#E8E8E8]">
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
              ? 'bg-[#ECFDF5] text-[#269568] border-[#A7F3D0]'
              : 'bg-[#FEF2F2] text-[#D64B4B] border-[#FECACA]'
          }`}
        >
          {submissionReady ? '✓ Submission Ready' : '✗ Submission Incomplete'}
        </span>
        <span
          className={`px-2 py-0.5 rounded font-medium border ${
            clearanceReady
              ? 'bg-[#ECFDF5] text-[#269568] border-[#A7F3D0]'
              : 'bg-[#FFFBEB] text-[#D69E36] border-[#FDE68A]'
          }`}
        >
          {clearanceReady ? '✓ Rights Assessed' : '⚠ Clearances Pending'}
        </span>
      </div>

      {/* Expanded Breakdown */}
      {expanded && (
        <div className="space-y-3 pt-3 border-t border-[#E8E8E8] text-xs">
          {criticalBlockers.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[#D64B4B] flex items-center space-x-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Critical Blockers ({criticalBlockers.length})</span>
              </span>
              <ul className="space-y-1 pl-4 text-[#777777] list-disc">
                {criticalBlockers.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[#D69E36] flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Advisories & Pending Items ({warnings.length})</span>
              </span>
              <ul className="space-y-1 pl-4 text-[#777777] list-disc">
                {warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}

          {completedItems.length > 0 && (
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-[#269568] flex items-center space-x-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Verified Milestones ({completedItems.length})</span>
              </span>
              <ul className="space-y-1 pl-4 text-[#777777] list-disc">
                {completedItems.slice(0, 5).map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
                {completedItems.length > 5 && (
                  <li className="text-[#999999] italic">+{completedItems.length - 5} more items verified</li>
                )}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-[#999999] pt-2 border-t border-[#E8E8E8]">
            Note: A 100% readiness score reflects completed submission data and does not constitute formal legal clearance or guaranteed approval by PHD Services.
          </p>
        </div>
      )}
    </div>
  );
}
