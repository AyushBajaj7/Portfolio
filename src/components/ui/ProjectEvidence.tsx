import { ArrowUpRight, GitBranch, Radio, Database } from 'lucide-react';

const projectEvidence: Record<number, { focus: string; decision: string; evidence: string; shortName: string }> = {
  1: { shortName: 'MDT', focus: 'Distributed systems', decision: 'Trace a code change across service boundaries.', evidence: 'AST analysis + Neo4j dependency traversal + semantic retrieval.' },
  2: { shortName: 'Cat-X', focus: 'Applied AI', decision: 'Bring operator signals into one decision workflow.', evidence: 'A team-built hackathon prototype with telemetry, hazard checks and trajectory simulation.' },
  10: { shortName: 'Traders ERP', focus: 'Data integrity', decision: 'Keep stock, invoices and ledgers consistent.', evidence: 'PostgreSQL functions coordinate financial and inventory updates in an installable app.' },
};

/** Short, inspectable engineering evidence rather than invented impact metrics. */
export function ProjectEvidence({ id }: { id: number }) {
  const proof = projectEvidence[id];
  if (!proof) return null;
  return <div className="project-evidence">
    <p className="evidence-label">Engineering focus</p>
    <p className="evidence-decision">{proof.decision}</p>
    <p className="evidence-detail">{proof.evidence}</p>
  </div>;
}

export function SelectedWorkLinks({ onSelect }: { onSelect: (id: number) => void }) {
  return <div className="selected-work-links" aria-label="Selected engineering work">
    {[GitBranch, Radio, Database].map((Icon, index) => {
      const id = [1, 2, 10][index];
      const item = projectEvidence[id];
      return <button key={id} type="button" onClick={() => onSelect(id)} className="selected-work-link">
        <span className="selected-work-top"><Icon size={15} aria-hidden="true" /><span>{item.focus}</span><ArrowUpRight size={14} aria-hidden="true" /></span>
        <span className="selected-work-name">{item.shortName}</span>
        <span className="selected-work-detail">{item.decision}</span>
      </button>;
    })}
  </div>;
}
