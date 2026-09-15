/** Explains exactly how the overall academic score was produced. */

import React from 'react';
import { Modal } from './Modal';
import { Meter } from './Indicators';
import { useDerived } from '../../state/store';

export function ScoreInfoDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { overall } = useDerived();

  return (
    <Modal
      open={open}
      title="How this score is calculated"
      subtitle="A weighted blend of what you have actually recorded. No estimates, no model."
      onClose={onClose}
    >
      <div className="stack stack--tight">
        {overall.breakdown.map((row) => (
          <div key={row.key}>
            <div className="row row--between" style={{ marginBottom: 4 }}>
              <span style={{ fontWeight: 540, fontSize: '0.875rem' }}>{row.label}</span>
              <span className="num muted" style={{ fontSize: '0.813rem' }}>
                {row.value === null ? 'No data' : `${row.value}%`} · weight {Math.round(row.weight * 100)}%
              </span>
            </div>
            <Meter value={row.value ?? 0} label={row.label} />
            <p className="faint" style={{ fontSize: '0.719rem', marginTop: 4 }}>
              {row.note}
              {row.contribution !== null && ` · contributes ${row.contribution} points`}
            </p>
          </div>
        ))}

        <hr className="rule" style={{ margin: '6px 0' }} />

        <div className="kv">
          <span className="kv__key">Overall score</span>
          <span className="kv__value">{overall.score === null ? 'Not enough data' : `${overall.score} / 100`}</span>
        </div>

        <div className="kv">
          <span className="kv__key">Syllabus coverage</span>
          <span className="kv__value">
            {overall.coverage === null ? 'No syllabus yet' : `${overall.coverage}%`}
          </span>
        </div>

        <p className="muted" style={{ fontSize: '0.813rem', lineHeight: 1.6 }}>
          Weights are renormalised over whatever you have recorded, so a signal you have not filled in
          never counts as zero. Mastery covers only topics you have started.
        </p>
        <p className="muted" style={{ fontSize: '0.813rem', lineHeight: 1.6 }}>
          Syllabus coverage is tracked separately and is <strong>not</strong> part of this score — early
          in the year most of the syllabus has simply not been taught yet, and counting that as failure
          would be wrong. It is judged against your other subjects when setting priorities.
        </p>
      </div>
    </Modal>
  );
}
