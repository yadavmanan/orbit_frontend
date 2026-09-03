import type { StatusItem } from '../types';
import { modalityClasses, modalityLabels } from '../theme';

interface StatusRailProps {
  items: StatusItem[];
  selectedSite: string | null;
  onSelectSite: (siteName: string | null) => void;
}

function getStatusBadge(pct: number) {
  if (pct > 88) {
    return { level: 'BOTTLENECK', className: 'badge-bottleneck' };
  }
  if (pct >= 75) {
    return { level: 'CONSTRAINED', className: 'badge-constrained' };
  }
  return { level: 'BALANCED', className: 'badge-balanced' };
}

export function StatusRail({ items, selectedSite, onSelectSite }: StatusRailProps) {
  return (
    <section className="panel panel-rail" aria-labelledby="network-status-title">
      <div className="panel-header">
        <div>
          <h2 id="network-status-title">Network status</h2>
          <p>Campus gauges & real-time telemetry.</p>
        </div>
        {selectedSite ? (
          <button
            type="button"
            className="filter-reset-btn"
            onClick={() => onSelectSite(null)}
          >
            Clear Filter: {selectedSite} ✕
          </button>
        ) : null}
      </div>
      <div className="status-list">
        {items.map((item) => {
          const badge = getStatusBadge(item.utilizationPercent);
          const isSelected = selectedSite === item.site;

          return (
            <article
              key={`${item.site}-${item.modality}`}
              className={`status-item ${badge.className} ${isSelected ? 'is-selected-site' : ''}`}
              onClick={() => onSelectSite(isSelected ? null : item.site)}
              title="Click campus card to filter live schedule board"
              style={{ cursor: 'pointer' }}
            >
              <div className="status-topline">
                <div>
                  <p className="status-site">{item.site}</p>
                  <div className="status-badges-row">
                    <p className={`modality-label ${modalityClasses[item.modality]}`}>
                      <span className="modality-dot" aria-hidden="true" />
                      {modalityLabels[item.modality]}
                    </p>
                    <span className={`status-level-tag ${badge.className}`}>
                      {badge.level}
                    </span>
                  </div>
                </div>
                <p className="hero-stat">{item.utilizationPercent}%</p>
              </div>
              <div className={`utilization-track ${badge.className}`} aria-hidden="true">
                <span style={{ width: `${Math.min(100, item.utilizationPercent)}%` }} />
              </div>
              <dl className="status-metrics">
                <div>
                  <dt>Queue</dt>
                  <dd>{item.queueDepth} cases</dd>
                </div>
                <div>
                  <dt>Idle</dt>
                  <dd>{item.idleHours.toFixed(1)} h</dd>
                </div>
                <div>
                  <dt>Coverage</dt>
                  <dd>{item.coverage}</dd>
                </div>
              </dl>
            </article>
          );
        })}
      </div>
    </section>
  );
}