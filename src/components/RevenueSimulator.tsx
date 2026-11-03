'use client';

import React, { useState } from 'react';
import { Calculator, DollarSign, Info } from 'lucide-react';
import { RECOUPMENT_LEGAL_NOTICE } from '@/lib/constants';

interface RevenueSimulatorProps {
  currency?: string;
  totalApprovedRecoupableCosts: number;
}

export function RevenueSimulator({
  currency = 'NGN',
  totalApprovedRecoupableCosts = 0,
}: RevenueSimulatorProps) {
  const initialRevenue = Math.max(totalApprovedRecoupableCosts * 2, 5000000);
  const [projectedGross, setProjectedGross] = useState(initialRevenue);

  // Recoupment waterfall
  const eligibleRecoupable = Math.min(projectedGross, totalApprovedRecoupableCosts);
  const netDistributable = Math.max(0, projectedGross - eligibleRecoupable);
  const artistShare = Math.round(netDistributable * 0.7);
  const phdShare = Math.round(netDistributable * 0.3);
  const unrecoupedBalance = Math.max(0, totalApprovedRecoupableCosts - eligibleRecoupable);

  return (
    <div className="bg-[#12151B] border border-[#1F2430] rounded-xl p-5 space-y-5">
      <div className="flex items-center justify-between border-b border-[#1F2430] pb-3">
        <div className="flex items-center space-x-2">
          <Calculator className="w-5 h-5 text-indigo-400" />
          <h3 className="text-sm font-semibold text-zinc-100">
            Revenue Waterfall & Recoupment Simulator
          </h3>
        </div>
        <span className="text-xs font-mono text-zinc-400 bg-[#1A1F2B] px-2.5 py-1 rounded border border-[#262D3D]">
          70% Artist / 30% PHD Split
        </span>
      </div>

      {/* Gross Revenue Input / Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-400">
            Projected Gross Distribution Revenue
          </label>
          <span className="text-sm font-bold font-mono text-indigo-400">
            {currency} {projectedGross.toLocaleString()}
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={Math.max(initialRevenue * 4, 25000000)}
          step={50000}
          value={projectedGross}
          onChange={(e) => setProjectedGross(Number(e.target.value))}
          className="w-full h-2 bg-[#1A1F2B] rounded-lg appearance-none cursor-pointer accent-indigo-500"
        />
        <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
          <span>{currency} 0</span>
          <span>{currency} {(Math.max(initialRevenue * 4, 25000000) / 2).toLocaleString()}</span>
          <span>{currency} {Math.max(initialRevenue * 4, 25000000).toLocaleString()}</span>
        </div>
      </div>

      {/* Waterfall Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
        <div className="p-3 rounded-lg bg-[#0E1015] border border-[#1F2430]">
          <span className="text-[11px] text-zinc-400">Gross Inflow</span>
          <p className="text-sm font-bold font-mono text-zinc-100 mt-1">
            {currency} {projectedGross.toLocaleString()}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-[#0E1015] border border-[#1F2430]">
          <span className="text-[11px] text-amber-400">Recouped Expenses</span>
          <p className="text-sm font-bold font-mono text-amber-400 mt-1">
            - {currency} {eligibleRecoupable.toLocaleString()}
          </p>
          <span className="text-[9px] text-zinc-500">
            (Total eligible: {currency} {totalApprovedRecoupableCosts.toLocaleString()})
          </span>
        </div>

        <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40">
          <span className="text-[11px] text-emerald-300 font-medium">Artist Share (70%)</span>
          <p className="text-base font-bold font-mono text-emerald-400 mt-1">
            {currency} {artistShare.toLocaleString()}
          </p>
        </div>

        <div className="p-3 rounded-lg bg-indigo-950/30 border border-indigo-800/40">
          <span className="text-[11px] text-indigo-300 font-medium">PHD Share (30%)</span>
          <p className="text-base font-bold font-mono text-indigo-400 mt-1">
            {currency} {phdShare.toLocaleString()}
          </p>
        </div>
      </div>

      {unrecoupedBalance > 0 && (
        <div className="text-xs text-zinc-400 bg-[#0E1015] p-3 rounded-lg border border-[#1F2430] flex items-center justify-between">
          <span>Unrecouped Eligible Balance:</span>
          <span className="font-mono text-amber-400 font-medium">
            {currency} {unrecoupedBalance.toLocaleString()}
          </span>
        </div>
      )}

      {/* Statutory Legal Disclaimer */}
      <div className="bg-[#0E1015] border border-[#1F2430] p-3 rounded-lg space-y-1.5">
        <div className="flex items-center space-x-1.5 text-zinc-400 text-xs font-semibold">
          <Info className="w-3.5 h-3.5 text-indigo-400" />
          <span>Statutory Schedule A Recoupment Provision</span>
        </div>
        <p className="text-[10px] text-zinc-400 leading-relaxed italic">
          "{RECOUPMENT_LEGAL_NOTICE}"
        </p>
        <p className="text-[9px] text-zinc-500 pt-1 border-t border-[#1F2430]">
          * This financial simulator is illustrative only and does not supersede or replace the financial and accounting provisions of the main Agreement.
        </p>
      </div>
    </div>
  );
}

