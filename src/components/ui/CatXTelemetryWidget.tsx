import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Zap,
  Compass,
} from 'lucide-react';

interface TelemetryMode {
  id: 'nominal' | 'hazard';
  label: string;
  fatigueScore: number;
  fatigueStatus: string;
  proximityStatus: string;
  proximityDetail: string;
  trajectoryStatus: string;
  advisory: string;
  severity: 'SAFE' | 'WARNING';
}

const MODES: Record<'nominal' | 'hazard', TelemetryMode> = {
  nominal: {
    id: 'nominal',
    label: 'Nominal Haul',
    fatigueScore: 14,
    fatigueStatus: 'Cognitive load: Nominal (Eye tracking normal)',
    proximityStatus: 'Safe (> 15m)',
    proximityDetail: 'LiDAR clear on all 360° zones',
    trajectoryStatus: 'Aligned (±0.02m Drift)',
    advisory: 'Haul cycle on trajectory. Zero corrective intervention required.',
    severity: 'SAFE',
  },
  hazard: {
    id: 'hazard',
    label: 'Hazard Alert',
    fatigueScore: 78,
    fatigueStatus: 'Fatigue anomaly (Micro-sleep & gaze drift)',
    proximityStatus: 'Breach (< 2.8m)',
    proximityDetail: 'Blind-spot obstruction on starboard haul path',
    trajectoryStatus: 'Divergent (+1.4m Drift)',
    advisory: 'Advisory: Haptic cab alert dispatched. Auto-retarder deceleration prepped.',
    severity: 'WARNING',
  },
};

export const CatXTelemetryWidget: React.FC = () => {
  const [activeMode, setActiveMode] = useState<'nominal' | 'hazard'>('nominal');
  const mode = MODES[activeMode];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="mt-4 rounded-xl border border-tertiary/25 bg-surface-container-lowest/80 p-3 sm:p-3.5 font-mono text-xs text-on-surface shadow-inner w-full"
    >
      {/* Widget Header - Responsive single-line layout */}
      <div className="flex items-center justify-between gap-1.5 border-b border-outline-variant/60 pb-2 mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="flex h-4 w-4 sm:h-5 sm:w-5 items-center justify-center rounded-md bg-tertiary/15 text-tertiary shrink-0">
            <Radio size={11} />
          </span>
          <span className="text-[10px] sm:text-[11px] uppercase font-bold tracking-wider text-tertiary truncate">
            Operator Safety Scenarios
          </span>
        </div>
        <span className="rounded-full bg-surface-container-high border border-outline-variant px-2 py-0.5 text-[8.5px] sm:text-[9px] text-tertiary font-mono flex items-center gap-1 shrink-0">
          SAMPLE DATA
        </span>
      </div>

      {/* Mode Toggle Buttons - 50/50 responsive grid */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <span className="text-[9.5px] sm:text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold shrink-0">
          Sim:
        </span>
        <div className="grid grid-cols-2 gap-1.5 flex-1">
          <button
            type="button"
            onClick={() => setActiveMode('nominal')}
            className={`w-full py-1 px-1.5 text-center rounded-lg text-[9.5px] sm:text-[10px] font-bold transition cursor-pointer border ${
              activeMode === 'nominal'
                ? 'bg-primary/20 text-primary border-primary/50'
                : 'border-outline-variant/60 text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <ShieldCheck size={11} className="inline-block mr-1" />Nominal
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('hazard')}
            className={`w-full py-1 px-1.5 text-center rounded-lg text-[9.5px] sm:text-[10px] font-bold transition cursor-pointer border ${
              activeMode === 'hazard'
                ? 'bg-error/20 text-error border-error/50'
                : 'border-outline-variant/60 text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <ShieldAlert size={11} className="inline-block mr-1" />Hazard scenario
          </button>
        </div>
      </div>

      <p className="mb-2.5 text-[9px] leading-4 text-on-surface-variant/75">Preset scenarios demonstrate the interface; values are illustrative, not a live sensor feed.</p>

      {/* Scenario telemetry */}
      <div className="space-y-2">
        {/* Metric 1: Operator Machine Fatigue */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="text-on-surface-variant flex items-center gap-1 text-[10px] sm:text-[11px]">
              <Activity size={12} className="text-tertiary shrink-0" />
              Operator Fatigue Index
            </span>
            <span
              className={`font-bold text-[10px] sm:text-[11px] ${
                mode.severity === 'SAFE' ? 'text-primary' : 'text-error'
              }`}
            >
              {mode.fatigueScore}% Index
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-surface-container-high overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${
                mode.severity === 'SAFE' ? 'bg-primary' : 'bg-error'
              }`}
              animate={{ width: `${mode.fatigueScore}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <p className="text-[9px] sm:text-[9.5px] text-on-surface-variant/80 mt-1 truncate">
            {mode.fatigueStatus}
          </p>
        </div>

        {/* Metric 2: 2-Column Sensor Readouts */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-[10px]">
          {/* LiDAR Proximity */}
          <div className="rounded-lg border border-outline-variant/50 bg-surface-container-high/40 p-1.5 sm:p-2">
            <div className="flex items-center justify-between text-on-surface-variant mb-0.5">
              <span className="flex items-center gap-1 text-[9.5px] sm:text-[10px]">
                {mode.severity === 'SAFE' ? (
                  <ShieldCheck size={11} className="text-primary shrink-0" />
                ) : (
                  <ShieldAlert size={11} className="text-error shrink-0" />
                )}
                LiDAR Proximity:
              </span>
              <span
                className={`font-bold text-[9.5px] sm:text-[10px] ${
                  mode.severity === 'SAFE' ? 'text-primary' : 'text-error'
                }`}
              >
                {mode.proximityStatus}
              </span>
            </div>
            <p className="text-[8.5px] sm:text-[9px] text-on-surface-variant/75 truncate">
              {mode.proximityDetail}
            </p>
          </div>

          {/* Trajectory Drift */}
          <div className="rounded-lg border border-outline-variant/50 bg-surface-container-high/40 p-1.5 sm:p-2">
            <div className="flex items-center justify-between text-on-surface-variant mb-0.5">
              <span className="flex items-center gap-1 text-[9.5px] sm:text-[10px]">
                <Compass size={11} className="text-tertiary shrink-0" />
                Haul Path:
              </span>
              <span
                className={`font-bold text-[9.5px] sm:text-[10px] ${
                  mode.severity === 'SAFE' ? 'text-primary' : 'text-error'
                }`}
              >
                {mode.severity === 'SAFE' ? 'Nominal' : 'Divergent'}
              </span>
            </div>
            <p className="text-[8.5px] sm:text-[9px] text-on-surface-variant/75 truncate">
              {mode.trajectoryStatus}
            </p>
          </div>
        </div>

        {/* Metric 3: Predictive Consequence Advisory */}
        <div className="rounded-lg border border-outline-variant/50 bg-surface-container-high/40 p-2 text-[10px]">
          <div className="text-[9px] sm:text-[9.5px] uppercase tracking-wider text-tertiary font-bold mb-0.5 flex items-center gap-1">
            <Zap size={11} className="shrink-0" />
            Consequence Engine Output:
          </div>
          <p className="text-on-surface text-[9.5px] sm:text-[10px] leading-4">
            {mode.advisory}
          </p>
        </div>
      </div>

      {/* Architecture Dataflow Breadcrumb */}
      <div className="mt-2.5 pt-2 border-t border-outline-variant/50 flex flex-wrap items-center gap-1 text-[8.5px] sm:text-[9px] text-on-surface-variant">
        <span className="px-1.5 py-0.5 rounded bg-surface border border-outline-variant">Telemetry WS</span>
        <span>➔</span>
        <span className="px-1.5 py-0.5 rounded bg-tertiary/10 border border-tertiary/30 text-tertiary">Fatigue ML</span>
        <span>➔</span>
        <span className="px-1.5 py-0.5 rounded bg-primary/10 border border-primary/30 text-primary">Consequence Graph</span>
      </div>
    </div>
  );
};
