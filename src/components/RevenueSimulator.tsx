'use client';

import React, { useState, useEffect } from 'react';
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

  // Sync projected gross when costs change to ensure the waterfall provides a sensible default
  useEffect(() => {
    if (totalApprovedRecoupableCosts > 0 && projectedGross < totalApprovedRecoupableCosts) {
      setProjectedGross(Math.round(totalApprovedRecoupableCosts * 1.5));
    }
  }, [totalApprovedRecoupableCosts]);

  const maxSlider = Math.max(initialRevenue * 4, 25000000);

  // Recoupment waterfall
  const eligibleRecoupable = Math.min(projectedGross, totalApprovedRecoupableCosts);
  const netDistributable = Math.max(0, projectedGross - eligibleRecoupable);
  const artistShare = Math.round(netDistributable * 0.7);
  const phdShare = Math.round(netDistributable * 0.3);
  const unrecoupedBalance = Math.max(0, totalApprovedRecoupableCosts - eligibleRecoupable);

  // Suggested revenue presets
  const presets = currency === 'NGN'
    ? [2000000, 5000000, 10000000, 25000000]
    : [5000, 15000, 30000, 75000];

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
          70% Artist / 30% PHD Net Distributable
        </span>
      </div>

      {/* Gross Revenue Input / Slider */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <label className="text-xs font-medium text-[#777777]">
              Projected Gross Distribution Revenue
            </label>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="text-xs text-[#999999]">Presets:</span>
              {presets.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setProjectedGross(val)}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium border transition-colors ${
                    projectedGross === val
                      ? 'bg-[#171717] text-white border-[#171717]'
                      : 'bg-[#F4F4F2] text-[#777777] border-[#E8E8E8] hover:text-[#171717]'
                  }`}
                >
                  {val >= 1000000 ? `${val / 1000000}M` : `${val / 1000}k`}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs font-mono font-bold text-[#777777]">{currency}</span>
            <input
              type="number"
              min={0}
              step={10000}
              value={projectedGross || ''}
              onChange={(e) => setProjectedGross(Number(e.target.value) || 0)}
              className="w-36 px-2.5 py-1 bg-[#F4F4F2] border border-[#E8E8E8] rounded text-sm font-bold font-mono text-[#171717] text-right focus:outline-none focus:border-[#171717]"
            />
          </div>
        </div>

        <input
          type="range"
          min={0}
          max={maxSlider}
          step={50000}
          value={Math.min(projectedGross, maxSlider)}
          onChange={(e) => setProjectedGross(Number(e.target.value))}
          className="w-full h-1.5 bg-[#E8E8E8] rounded-lg appearance-none cursor-pointer accent-[#171717]"
        />

        <div className="flex justify-between text-[10px] text-[#999999] font-mono">
          <span>{currency} 0</span>
          <span>{currency} {(maxSlider / 2).toLocaleString()}</span>
          <span>{currency} {maxSlider.toLocaleString()}</span>
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
