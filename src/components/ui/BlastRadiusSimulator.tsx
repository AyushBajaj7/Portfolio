import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  RotateCcw,
  Cpu,
  Sparkles,
  GitCommit,
  Network,
} from 'lucide-react';

interface ServiceNode {
  id: string;
  name: string;
  runtime: string;
  role: string;
  dependencies: string[]; // downstream depends on this or calls this
}

interface Scenario {
  id: string;
  title: string;
  sourceNode: string;
  diffSummary: string;
  impactedNodes: string[];
  riskScore: number;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  ragExplanation: string;
}

const SERVICES: ServiceNode[] = [
  { id: 'auth', name: 'auth-service', runtime: 'Go / gRPC', role: 'Authentication', dependencies: ['order', 'payment'] },
  { id: 'payment', name: 'payment-svc', runtime: 'Java / Spring', role: 'Payment Gateway', dependencies: ['order'] },
  { id: 'order', name: 'order-engine', runtime: 'FastAPI / Python', role: 'Order Fulfillment', dependencies: ['inventory', 'notif'] },
  { id: 'inventory', name: 'inventory-db', runtime: 'PostgreSQL', role: 'Stock & Ledger', dependencies: [] },
  { id: 'notif', name: 'notif-worker', runtime: 'Node / Kafka', role: 'Event Consumer', dependencies: [] },
];

const SCENARIOS: Scenario[] = [
  {
    id: 'breaking-payment',
    title: 'Breaking Schema in payment-svc (v2.4)',
    sourceNode: 'payment',
    diffSummary: "Removed field 'currency_iso' and changed 'amount_cents' from float to integer.",
    impactedNodes: ['order', 'notif'],
    riskScore: 88,
    severity: 'HIGH',
    ragExplanation:
      'ChromaDB RAG detected breaking contract drift: order-engine deserializer expects float amounts; downstream notif-worker schema validation will reject event stream.',
  },
  {
    id: 'db-migration',
    title: 'Column Drop Migration on inventory-db',
    sourceNode: 'inventory',
    diffSummary: "ALTER TABLE stock DROP COLUMN legacy_sku_code CASCADE;",
    impactedNodes: ['order'],
    riskScore: 68,
    severity: 'MEDIUM',
    ragExplanation:
      'Neo4j graph indicates order-engine queries legacy_sku_code during batch reservation. Risk score 68/100 due to backward-incompatibility.',
  },
  {
    id: 'safe-refactor',
    title: 'Safe JWT Redis Cache in auth-service',
    sourceNode: 'auth',
    diffSummary: "Added in-memory Redis cluster for session token validation (0 schema changes).",
    impactedNodes: [],
    riskScore: 14,
    severity: 'LOW',
    ragExplanation:
      'Zero API contract drift detected. AST diff verified complete backwards-compatibility. Blast radius is isolated to auth-service internal memory.',
  },
];

export const BlastRadiusSimulator: React.FC<{ onExploreMore?: () => void }> = ({ onExploreMore }) => {
  const [selectedScenario, setSelectedScenario] = useState<Scenario>(SCENARIOS[0]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationStage, setSimulationStage] = useState<'idle' | 'ast' | 'graph' | 'rag' | 'complete'>('idle');
  const [hasRun, setHasRun] = useState(false);

  const runSimulation = useCallback(() => {
    setIsSimulating(true);
    setHasRun(true);
    setSimulationStage('ast');

    setTimeout(() => {
      setSimulationStage('graph');
      setTimeout(() => {
        setSimulationStage('rag');
        setTimeout(() => {
          setSimulationStage('complete');
          setIsSimulating(false);
        }, 320);
      }, 300);
    }, 280);
  }, []);

  const handleSelectScenario = (scenario: Scenario) => {
    setSelectedScenario(scenario);
    setSimulationStage('idle');
    setHasRun(false);
  };

  const isImpacted = (nodeId: string) => {
    if (!hasRun && simulationStage === 'idle') return false;
    return selectedScenario.impactedNodes.includes(nodeId);
  };

  const isSource = (nodeId: string) => {
    return selectedScenario.sourceNode === nodeId;
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="rounded-2xl border border-primary/25 bg-surface/90 p-4 sm:p-5 font-sans text-on-surface shadow-xl"
    >
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant/60 pb-3">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Network size={14} />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-primary">
                Interactive AST Blast-Radius Simulator
              </span>
              <span className="rounded-full bg-surface-container-high border border-outline-variant px-2 py-0.2 text-[9px] font-mono text-on-surface-variant">
                MDT Engine v2.4
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant font-mono">
              Simulate Git commit diffs across microservice dependency graph
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={runSimulation}
            disabled={isSimulating}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold font-mono transition cursor-pointer ${
              isSimulating
                ? 'bg-primary/20 text-primary cursor-wait'
                : 'bg-primary text-on-primary hover:bg-primary-dim shadow-md shadow-primary/20'
            }`}
          >
            {isSimulating ? (
              <>
                <Cpu size={13} className="animate-spin" />
                Analyzing AST...
              </>
            ) : (
              <>
                <Play size={13} fill="currentColor" />
                {hasRun ? 'Re-run Analysis' : 'Run Blast-Radius'}
              </>
            )}
          </button>

          {hasRun && (
            <button
              type="button"
              onClick={() => {
                setHasRun(false);
                setSimulationStage('idle');
              }}
              title="Reset simulator"
              className="p-1.5 rounded-lg border border-outline-variant hover:border-primary/40 text-on-surface-variant hover:text-primary transition cursor-pointer"
            >
              <RotateCcw size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Scenario Selector Pills */}
      <div className="mt-3.5 flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant mr-1">
          Commit Diff:
        </span>
        {SCENARIOS.map((sc) => {
          const isSelected = selectedScenario.id === sc.id;
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => handleSelectScenario(sc)}
              className={`rounded-lg px-2.5 py-1 text-[11px] font-mono transition cursor-pointer border ${
                isSelected
                  ? 'border-primary bg-primary/15 text-primary font-semibold'
                  : 'border-outline-variant/60 bg-surface-container-high/40 text-on-surface-variant hover:border-outline-variant hover:text-on-surface'
              }`}
            >
              <GitCommit size={11} className="inline mr-1 opacity-70" />
              {sc.title}
            </button>
          );
        })}
      </div>

      {/* Active Diff Description */}
      <div className="mt-2.5 rounded-xl border border-outline-variant/40 bg-surface-container-high/30 px-3 py-2 text-xs font-mono flex items-center justify-between gap-3">
        <div className="text-on-surface-variant truncate">
          <span className="text-primary font-bold">Diff: </span>
          <span className="text-on-surface">{selectedScenario.diffSummary}</span>
        </div>
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
            selectedScenario.severity === 'HIGH'
              ? 'bg-error/15 text-error border border-error/30'
              : selectedScenario.severity === 'MEDIUM'
              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
              : 'bg-primary/15 text-primary border border-primary/30'
          }`}
        >
          {selectedScenario.severity} RISK
        </span>
      </div>

      {/* Interactive Microservice Graph Topology */}
      <div className="mt-4 rounded-xl border border-outline-variant/50 bg-surface-container-lowest/60 p-3 sm:p-4">
        <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant/70 mb-3 flex items-center justify-between">
          <span>GRAPH TOPOLOGY (NEO4J DEPTH TRAVERSAL)</span>
          {simulationStage !== 'idle' && simulationStage !== 'complete' && (
            <span className="text-primary flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
              {simulationStage === 'ast' && 'Step 1/3: Tokenizing AST Symbols...'}
              {simulationStage === 'graph' && 'Step 2/3: Traversing Neo4j Dependency Graph...'}
              {simulationStage === 'rag' && 'Step 3/3: ChromaDB Semantic Drift Score...'}
            </span>
          )}
        </div>

        {/* Nodes Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {SERVICES.map((svc) => {
            const isSrc = isSource(svc.id);
            const isImp = isImpacted(svc.id);
            const isSafe = hasRun && !isSrc && !isImp;

            return (
              <motion.div
                key={svc.id}
                animate={{
                  scale: isSrc || isImp ? 1.03 : 1,
                }}
                transition={{ duration: 0.2 }}
                className={`relative rounded-xl p-2.5 border font-mono transition-all duration-300 ${
                  isSrc
                    ? 'border-error/80 bg-error/10 shadow-lg shadow-error/20 ring-1 ring-error/50'
                    : isImp
                    ? 'border-amber-400/80 bg-amber-500/10 shadow-lg shadow-amber-400/20 ring-1 ring-amber-400/50'
                    : isSafe
                    ? 'border-primary/20 bg-primary/5 opacity-80'
                    : 'border-outline-variant/60 bg-surface-container-high/50'
                }`}
              >
                {/* Node Status Badge */}
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-mono text-on-surface-variant/80 uppercase">
                    {svc.runtime.split('/')[0]}
                  </span>
                  {isSrc && (
                    <span className="rounded bg-error px-1 py-0.2 text-[8px] font-bold text-white uppercase animate-pulse">
                      SOURCE
                    </span>
                  )}
                  {isImp && (
                    <span className="rounded bg-amber-500 px-1 py-0.2 text-[8px] font-bold text-black uppercase animate-pulse">
                      BROKEN
                    </span>
                  )}
                  {isSafe && (
                    <span className="rounded bg-primary/20 text-primary px-1 py-0.2 text-[8px] font-bold uppercase">
                      STABLE
                    </span>
                  )}
                </div>

                <div className="font-bold text-xs text-on-surface leading-tight truncate">
                  {svc.name}
                </div>
                <div className="text-[10px] text-on-surface-variant truncate mt-0.5">
                  {svc.role}
                </div>

                {/* Microservice Pulse Ring */}
                {(isSrc || isImp) && (
                  <span className="absolute -top-1 -right-1 flex h-3 w-3">
                    <span
                      className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                        isSrc ? 'bg-error' : 'bg-amber-400'
                      }`}
                    />
                    <span
                      className={`relative inline-flex rounded-full h-3 w-3 ${
                        isSrc ? 'bg-error' : 'bg-amber-500'
                      }`}
                    />
                  </span>
                )}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Analysis Results / Telemetry Output */}
      <AnimatePresence>
        {hasRun && simulationStage === 'complete' && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 rounded-xl border border-primary/30 bg-surface/80 p-3.5 sm:p-4 font-mono text-xs space-y-3"
          >
            {/* Risk Index meter */}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold uppercase text-on-surface">
                  HMDA BLAST-RADIUS IMPACT SCORE:
                </span>
                <span
                  className={`text-sm font-extrabold px-2.5 py-0.5 rounded-lg border ${
                    selectedScenario.riskScore >= 75
                      ? 'border-error text-error bg-error/15'
                      : selectedScenario.riskScore >= 40
                      ? 'border-amber-400 text-amber-400 bg-amber-400/15'
                      : 'border-primary text-primary bg-primary/15'
                  }`}
                >
                  {selectedScenario.riskScore} / 100
                </span>
              </div>

              <div className="text-[11px] text-on-surface-variant">
                Impacted Nodes: <span className="text-on-surface font-bold">{selectedScenario.impactedNodes.length}</span> · 
                Safe Nodes: <span className="text-primary font-bold">{SERVICES.length - selectedScenario.impactedNodes.length - 1}</span>
              </div>
            </div>

            {/* Explanation box */}
            <div className="rounded-lg border border-outline-variant/60 bg-surface-container-high/40 p-2.5 text-on-surface leading-5 text-[11px]">
              <div className="text-primary font-bold mb-1 flex items-center gap-1">
                <Sparkles size={12} />
                ChromaDB Semantic Analysis:
              </div>
              <p className="text-on-surface-variant">{selectedScenario.ragExplanation}</p>
            </div>

            {onExploreMore && (
              <div className="pt-1 flex justify-end">
                <button
                  type="button"
                  onClick={onExploreMore}
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                >
                  View full AST pipeline in Case Study →
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
