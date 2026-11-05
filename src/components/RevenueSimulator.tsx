'use client';

import React, { useState } from 'react';
import { Calculator, Info } from 'lucide-react';

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
    <div className="bg-white border border-[#E8E8E8] rounded-lg p-5 space-y-5 shadow-sm select-none">
      <div className="flex items-center justify-between border-b border-[#E8E8E8] pb-3">
        <div className="flex items-center space-x-2">
          <Calculator className="w-4 h-4 text-[#171717]" />
          <h3 className="text-xs font-semibold text-[#171717] uppercase tracking-wider">
            Revenue Waterfall & Recoupment Calculator
          </h3>
        </div>
        <span className="text-[11px] font-mono text-[#777777] bg-[#F4F4F2] px-2.5 py-0.5 rounded border border-[#E8E8E8]">
          70% Artist / 30% PHD
        </span>
      </div>

      {/* Gross Revenue Input / Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-[#777777]">
            Projected Gross Distribution Revenue
          </label>
          <span className="text-sm font-bold font-mono text-[#171717]">
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
          className="w-full h-1.5 bg-[#E8E8E8] rounded-lg appearance-none cursor-pointer accent-[#171717]"
        />
        <div className="flex justify-between text-[10px] text-[#999999] font-mono">
          <span>{currency} 0</span>
          <span>{currency} {(Math.max(initialRevenue * 4, 25000000) / 2).toLocaleString()}</span>
          <span>{currency} {Math.max(initialRevenue * 4, 25000000).toLocaleString()}</span>
        </div>
      </div>

      {/* Waterfall Breakdown Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-center">
        <div className="p-3 rounded-md bg-[#F4F4F2] border border-[#E8E8E8]">
          <span className="text-[11px] text-[#777777]">Gross Inflow</span>
          <p className="text-sm font-bold font-mono text-[#171717] mt-1">
            {currency} {projectedGross.toLocaleString()}
          </p>
        </div>

        <div className="p-3 rounded-md bg-[#F4F4F2] border border-[#E8E8E8]">
          <span className="text-[11px] text-[#D69E36]">Recouped Expenses</span>
          <p className="text-sm font-bold font-mono text-[#D69E36] mt-1">
            - {currency} {eligibleRecoupable.toLocaleString()}
          </p>
          <span className="text-[9px] text-[#999999] block font-mono">
            (Pool: {currency} {totalApprovedRecoupableCosts.toLocaleString()})
          </span>
        </div>

        <div className="p-3 rounded-md bg-[#ECFDF5] border border-[#A7F3D0]">
          <span className="text-[11px] text-[#269568] font-medium">Artist Share (70%)</span>
          <p className="text-base font-bold font-mono text-[#269568] mt-1">
            {currency} {artistShare.toLocaleString()}
          </p>
        </div>

        <div className="p-3 rounded-md bg-[#F4F4F2] border border-[#E8E8E8]">
          <span className="text-[11px] text-[#171717] font-medium">PHD Share (30%)</span>
          <p className="text-base font-bold font-mono text-[#171717] mt-1">
            {currency} {phdShare.toLocaleString()}
          </p>
        </div>
      </div>

      {unrecoupedBalance > 0 && (
        <div className="p-3 rounded-md bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#D69E36] flex items-center space-x-2">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>
            Unrecouped expenditure balance carried forward: <strong>{currency} {unrecoupedBalance.toLocaleString()}</strong>.
          </span>
        </div>
      )}
    </div>
  );
}
