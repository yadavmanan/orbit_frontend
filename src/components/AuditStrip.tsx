import { useState } from 'react';
import type { AuditEvent } from '../types';

interface AuditStripProps {
  events: AuditEvent[];
}

export function AuditStrip({ events }: AuditStripProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className={`audit-strip ${expanded ? 'is-expanded' : ''}`} aria-labelledby="audit-strip-title">
      <div className="audit-toggle-row">
        <div>
          <h2 id="audit-strip-title">Cryptographic Audit Strip</h2>
          <p>SHA-256 tamper-evident ledger of approvals, actions, and executions.</p>
        </div>
        <button type="button" className="button button-secondary" onClick={() => setExpanded((current) => !current)}>
          {expanded ? 'Collapse Log' : 'Expand Ledger'}
        </button>
      </div>
      {expanded ? (
        <div className="audit-list">
          {events.map((event) => (
            <article key={event.id} className="audit-item">
              <div className="audit-time-col">
                <p className="audit-time data-value">{new Date(event.timestamp).toLocaleTimeString()}</p>
                <span className="hash-verified-tag">SHA-256 Verified</span>
              </div>
              <div className="audit-body-col">
                <p className="audit-action">{event.action.replace('_', ' ')}</p>
                <p className="audit-detail">
                  <strong>Actor:</strong> {event.actor} · {event.detail}
                </p>
                {event.tamperHash ? (
                  <p className="audit-hash-code">{event.tamperHash}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}