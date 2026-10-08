import React, { useState } from 'react';
import {
  Boxes,
  ArrowRight,
  RotateCcw,
  ShieldCheck,
  Receipt,
  TrendingDown,
  TrendingUp,
  Cpu,
  Layers,
  FileCheck,
} from 'lucide-react';

interface Scenario {
  id: string;
  label: string;
  type: 'sale' | 'purchase' | 'reconciliation';
  description: string;
  items: { name: string; delta: number; unit: string; current: number }[];
  ledger: { account: string; type: 'debit' | 'credit'; amount: string; note: string }[];
  vctsHash: string;
  sqlDuration: string;
}

const SCENARIOS: Scenario[] = [
  {
    id: 'sale-tmt',
    label: 'Hardware Sale (TMT Steel + PVC)',
    type: 'sale',
    description: 'B2B Credit Invoice: Dispatches 500 kg TMT steel and 20x pressure pipes with auto VAT calculation.',
    items: [
      { name: 'TMT Steel Fe-550 (12mm)', delta: -500, unit: 'kg', current: 2850 },
      { name: 'PVC Pressure Pipes (4")', delta: -20, unit: 'pcs', current: 140 },
      { name: 'UltraTech Cement (53-G)', delta: 0, unit: 'bags', current: 320 },
    ],
    ledger: [
      { account: 'Customer Account (Shree Ram Traders)', type: 'debit', amount: 'NPR 48,500', note: 'Accounts Receivable' },
      { account: 'Hardware Sales Revenue', type: 'credit', amount: 'NPR 42,920', note: 'Operating Revenue' },
      { account: 'Government Output VAT (13%)', type: 'credit', amount: 'NPR 5,580', note: 'Tax Liability' },
    ],
    vctsHash: 'NP-VCTS-2026-9812A-VERIFIED',
    sqlDuration: '4.2ms',
  },
  {
    id: 'restock-cement',
    label: 'Supplier Consignment Inflow',
    type: 'purchase',
    description: 'Purchase Receipt: Ingests 150 bags of cement, updates weighted average cost, and logs supplier payable.',
    items: [
      { name: 'TMT Steel Fe-550 (12mm)', delta: 0, unit: 'kg', current: 3350 },
      { name: 'PVC Pressure Pipes (4")', delta: 0, unit: 'pcs', current: 160 },
      { name: 'UltraTech Cement (53-G)', delta: 150, unit: 'bags', current: 470 },
    ],
    ledger: [
      { account: 'Raw Inventory Asset (Cement)', type: 'debit', amount: 'NPR 112,500', note: 'Inventory Value' },
      { account: 'Input VAT Credit (13%)', type: 'debit', amount: 'NPR 14,625', note: 'Tax Credit' },
      { account: 'Supplier Account (Shivam Minerals)', type: 'credit', amount: 'NPR 127,125', note: 'Accounts Payable' },
    ],
    vctsHash: 'NP-VCTS-2026-4409B-VERIFIED',
    sqlDuration: '3.8ms',
  },
  {
    id: 'offline-reconcile',
    label: 'PWA Offline Sync & Cashbook',
    type: 'reconciliation',
    description: 'IndexedDB reconciliation: Replays 3 queued offline cash receipts atomically into PostgreSQL.',
    items: [
      { name: 'TMT Steel Fe-550 (12mm)', delta: -50, unit: 'kg', current: 3300 },
      { name: 'PVC Pressure Pipes (4")', delta: -5, unit: 'pcs', current: 155 },
      { name: 'UltraTech Cement (53-G)', delta: 0, unit: 'bags', current: 320 },
    ],
    ledger: [
      { account: 'Petty Cash / Counter Cashbook', type: 'debit', amount: 'NPR 14,200', note: 'Cash in Hand' },
      { account: 'Retail Counter Sales', type: 'credit', amount: 'NPR 12,566', note: 'Cash Revenue' },
      { account: 'Output VAT (13%)', type: 'credit', amount: 'NPR 1,634', note: 'Tax Collected' },
    ],
    vctsHash: 'NP-VCTS-2026-7731K-VERIFIED',
    sqlDuration: '6.1ms',
  },
];

export const TradersErpSimulator: React.FC<{
  onExploreMore?: () => void;
}> = ({ onExploreMore }) => {
  const [activeScenarioId, setActiveScenarioId] = useState<string>('sale-tmt');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const scenario = SCENARIOS.find((s) => s.id === activeScenarioId) || SCENARIOS[0];

  const handleExecute = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
    }, 450);
  };

  const handleScenarioChange = (id: string) => {
    setActiveScenarioId(id);
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
    }, 300);
  };

  return (
    <div className="rounded-2xl border border-outline-variant bg-surface-container-high/40 p-4 sm:p-5 backdrop-blur-sm space-y-4">
      {/* Top Header & Simulation Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-outline-variant/60">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/15 text-primary border border-primary/30">
            <Boxes size={16} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-label font-bold uppercase tracking-[0.16em] text-primary">
                INTERACTIVE ERP & VCTS ENGINE
              </span>
              <span className="rounded-md border border-outline-variant/60 bg-surface/80 px-1.5 py-0.5 text-[9px] font-mono text-on-surface-variant">
                PostgreSQL RPC
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant line-clamp-1">
              Atomic transaction execution, inventory ledger sync, and compliance hashing
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleExecute}
          disabled={isProcessing}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:bg-primary-dim transition active:scale-95 cursor-pointer disabled:opacity-50"
        >
          {isProcessing ? (
            <RotateCcw size={13} className="animate-spin" />
          ) : (
            <Cpu size={13} />
          )}
          <span>{isProcessing ? 'Executing...' : 'Trigger Stored-Proc'}</span>
        </button>
      </div>

      {/* Scenario Selection Chips */}
      <div>
        <div className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant/80 mb-1.5 flex items-center gap-1.5">
          <span>SELECT BUSINESS WORKFLOW:</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SCENARIOS.map((s) => {
            const isSelected = s.id === activeScenarioId;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleScenarioChange(s.id)}
                className={`text-left p-2.5 rounded-xl border text-xs transition cursor-pointer ${
                  isSelected
                    ? 'border-primary/60 bg-primary/10 text-on-surface shadow-xs font-semibold'
                    : 'border-outline-variant/70 bg-surface/60 text-on-surface-variant hover:text-on-surface hover:border-outline-variant'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-mono uppercase tracking-wider opacity-70">
                    {s.type}
                  </span>
                  {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
                <div className="text-[11px] font-medium line-clamp-1">{s.label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Scenario Detail Banner */}
      <div className="rounded-xl border border-outline-variant/60 bg-surface/50 p-2.5 text-xs text-on-surface-variant flex items-start gap-2">
        <Receipt size={14} className="text-primary mt-0.5 shrink-0" />
        <span className="text-[11px] leading-relaxed">{scenario.description}</span>
      </div>

      {/* Dual Column: Real-Time Inventory Impact + Double-Entry General Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Live Inventory Stock Levels */}
        <div className="rounded-xl border border-outline-variant/60 bg-surface/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Boxes size={12} className="text-primary" />
              INVENTORY DELTA (POST-SYNC)
            </span>
            <span className="text-primary font-bold">{scenario.sqlDuration}</span>
          </div>

          <div className="space-y-2 pt-1">
            {scenario.items.map((item) => {
              const hasChange = item.delta !== 0;
              return (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-on-surface font-medium truncate max-w-[180px]">
                      {item.name}
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-[10px]">
                      {hasChange && (
                        <span
                          className={`font-bold inline-flex items-center ${
                            item.delta > 0 ? 'text-primary' : 'text-amber-500'
                          }`}
                        >
                          {item.delta > 0 ? (
                            <TrendingUp size={11} className="mr-0.5" />
                          ) : (
                            <TrendingDown size={11} className="mr-0.5" />
                          )}
                          {item.delta > 0 ? `+${item.delta}` : item.delta} {item.unit}
                        </span>
                      )}
                      <span className="text-on-surface-variant font-bold">
                        {item.current} {item.unit}
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        hasChange ? 'bg-primary' : 'bg-outline-variant'
                      }`}
                      style={{
                        width: `${Math.min(100, Math.max(15, (item.current / 3500) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Double-Entry General Ledger */}
        <div className="rounded-xl border border-outline-variant/60 bg-surface/60 p-3 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
            <span className="flex items-center gap-1">
              <Layers size={12} className="text-tertiary" />
              DOUBLE-ENTRY LEDGER (ATOMIC)
            </span>
            <span className="text-emerald-500 font-bold flex items-center gap-0.5">
              <ShieldCheck size={11} /> BALANCED
            </span>
          </div>

          <div className="space-y-1.5 pt-1 font-mono text-[10px]">
            {scenario.ledger.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-1.5 rounded-lg bg-surface-container-high/40 border border-outline-variant/40"
              >
                <div className="flex items-center gap-1.5 truncate max-w-[170px]">
                  <span
                    className={`px-1 py-0.2 rounded text-[9px] font-bold uppercase ${
                      entry.type === 'debit'
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    {entry.type === 'debit' ? 'DR' : 'CR'}
                  </span>
                  <span className="text-on-surface truncate">{entry.account}</span>
                </div>
                <span className="font-bold text-on-surface shrink-0">{entry.amount}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Compliance & Verification Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-outline-variant/60 text-[10px] font-mono text-on-surface-variant">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-primary font-bold">
            <FileCheck size={12} />
            NEPAL VCTS DISPATCH:
          </span>
          <span className="text-on-surface bg-surface px-1.5 py-0.5 rounded border border-outline-variant">
            {scenario.vctsHash}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-emerald-500 font-bold">● Atomic Sync Valid</span>
          {onExploreMore && (
            <button
              type="button"
              onClick={onExploreMore}
              className="text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
            >
              Case Study <ArrowRight size={10} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
