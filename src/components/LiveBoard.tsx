import { useState } from 'react';
import type { BoardSlot, ConstraintProfile, Modality, Urgency } from '../types';
import { modalityClasses, modalityLabels, urgencyClasses } from '../theme';

interface LiveBoardProps {
  slots: BoardSlot[];
  constraints: ConstraintProfile;
  selectedSiteFilter?: string | null;
}

export function LiveBoard({ slots, constraints, selectedSiteFilter }: LiveBoardProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [modalityFilter, setModalityFilter] = useState<Modality | 'ALL'>('ALL');
  const [urgencyFilter, setUrgencyFilter] = useState<Urgency | 'ALL'>('ALL');
  const [activeModalSlot, setActiveModalSlot] = useState<BoardSlot | null>(null);

  const filteredSlots = slots.filter((slot) => {
    if (selectedSiteFilter && slot.siteName && !slot.siteName.toLowerCase().includes(selectedSiteFilter.toLowerCase()) && !slot.scanner.toLowerCase().includes(selectedSiteFilter.toLowerCase())) {
      return false;
    }
    if (modalityFilter !== 'ALL' && slot.modality !== modalityFilter) {
      return false;
    }
    if (urgencyFilter !== 'ALL' && slot.urgency !== urgencyFilter) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        slot.caseId.toLowerCase().includes(q) ||
        slot.scanner.toLowerCase().includes(q) ||
        slot.status.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <section className="panel panel-board" aria-labelledby="live-board-title">
      <div className="panel-header panel-header-board">
        <div>
          <h2 id="live-board-title">Live Schedule Board</h2>
          <p>Multi-modality feed with STAT pulse alerts & real-time filters.</p>
        </div>
        <div className="constraint-block">
          <span className="constraint-metric">Travel Cap {constraints.maxTravelKm} km</span>
          <span className="constraint-metric">
            Remote Reading {constraints.remoteReadingEnabled ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      </div>

      <div className="board-toolbar">
        <div className="search-box">
          <span className="search-icon">Search</span>
          <input
            type="text"
            placeholder="Search MRN, case ID, scanner..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery ? (
            <button type="button" className="clear-search" onClick={() => setSearchQuery('')}>✕</button>
          ) : null}
        </div>

        <div className="filter-chips">
          <div className="chip-group">
            <span className="group-label">Modality:</span>
            {(['ALL', 'MRI', 'CT', 'XRAY', 'US'] as const).map((mod) => (
              <button
                key={mod}
                type="button"
                className={`chip ${modalityFilter === mod ? 'active' : ''}`}
                onClick={() => setModalityFilter(mod)}
              >
                {mod}
              </button>
            ))}
          </div>

          <div className="chip-group">
            <span className="group-label">Urgency:</span>
            {(['ALL', 'stat', 'urgent', 'routine'] as const).map((urg) => (
              <button
                key={urg}
                type="button"
                className={`chip ${urgencyFilter === urg ? 'active' : ''} urgency-chip-${urg}`}
                onClick={() => setUrgencyFilter(urg)}
              >
                {urg === 'stat' ? '⚡ STAT' : urg.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="board-grid" role="list">
        {filteredSlots.length === 0 ? (
          <p className="empty-state">No matching appointments found on live board.</p>
        ) : (
          filteredSlots.map((slot) => {
            const isStat = slot.urgency === 'stat';

            return (
              <article
                key={`${slot.timeLabel}-${slot.caseId}-${slot.scanner}`}
                className={`board-slot ${modalityClasses[slot.modality]} ${isStat ? 'is-stat-glow' : ''}`}
                role="listitem"
                onClick={() => setActiveModalSlot(slot)}
                style={{ cursor: 'pointer' }}
                title="Click to open appointment inspector"
              >
                <div className="slot-top-row">
                  <p className="board-time">{slot.timeLabel}</p>
                  {isStat ? (
                    <span className="stat-pulse-badge">⚡ STAT</span>
                  ) : null}
                </div>
                <div className="board-main">
                  <p className="board-scanner">{slot.scanner}</p>
                  <p className={`modality-label ${modalityClasses[slot.modality]}`}>
                    <span className="modality-dot" aria-hidden="true" />
                    {modalityLabels[slot.modality]}
                  </p>
                </div>
                <div className={`urgency-accent ${urgencyClasses[slot.urgency]}`}>
                  <p className="data-value">{slot.caseId}</p>
                  <p className="board-status">{slot.status}</p>
                </div>
              </article>
            );
          })
        )}
      </div>

      <div className="constraint-notes">
        <p>Protected Shifts & Holds</p>
        <ul>
          {constraints.protectedShifts.map((shift) => (
            <li key={shift}>{shift}</li>
          ))}
        </ul>
      </div>

      {activeModalSlot ? (
        <div className="modal-backdrop" onClick={() => setActiveModalSlot(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Appointment Detail Inspector</h3>
              <button type="button" className="close-btn" onClick={() => setActiveModalSlot(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <strong>Patient MRN:</strong>
                <span className="data-value">{activeModalSlot.caseId}</span>
              </div>
              <div className="detail-row">
                <strong>Scheduled Start:</strong>
                <span>{activeModalSlot.timeLabel}</span>
              </div>
              <div className="detail-row">
                <strong>Assigned Suite:</strong>
                <span>{activeModalSlot.scanner}</span>
              </div>
              <div className="detail-row">
                <strong>Modality & Protocol:</strong>
                <span>{activeModalSlot.modality} Scan Protocol (Standard High-Resolution)</span>
              </div>
              <div className="detail-row">
                <strong>Urgency Tier:</strong>
                <span className={`urgency-tag ${urgencyClasses[activeModalSlot.urgency]}`}>
                  {activeModalSlot.urgency.toUpperCase()}
                </span>
              </div>
              <div className="detail-row">
                <strong>Read Status & Site:</strong>
                <span>{activeModalSlot.status}</span>
              </div>
              <div className="detail-row">
                <strong>Clinical Notes:</strong>
                <p className="modal-note-text">
                  Synthetic patient study queued. Referring physician requested same-day study completion and DICOM sync.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="button button-primary" onClick={() => setActiveModalSlot(null)}>
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}