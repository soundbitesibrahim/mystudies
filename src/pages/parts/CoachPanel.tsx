/** Rule-based observations. Explicitly not an AI — the rules are in lib/coach.ts. */

import React from 'react';
import { useDerived } from '../../state/store';
import { StatusDot, type Tone } from '../../components/ui/Indicators';

const TONE: Record<string, Tone> = {
  risk: 'risk',
  attention: 'attention',
  positive: 'good',
  neutral: 'none',
};

export function CoachPanel() {
  const { insights } = useDerived();

  return (
    <>
      <div className="section__head">
        <div>
          <h2>Coach insights</h2>
          <p className="section__hint">Plain rules applied to your own data — not a model.</p>
        </div>
      </div>
      <div className="panel">
        {!insights.length ? (
          <p className="muted" style={{ padding: '18px 20px', fontSize: '0.844rem' }}>
            Nothing worth flagging yet. Record a few results and study sessions and observations will
            appear here.
          </p>
        ) : (
          insights.map((insight, i) => (
            <div
              key={insight.id}
              className="list-row enter--fast"
              style={{ ['--i' as string]: i, alignItems: 'flex-start' }}
            >
              <span className="row" style={{ gap: 10, alignItems: 'flex-start' }}>
                <span style={{ paddingTop: 7 }}>
                  <StatusDot tone={TONE[insight.tone] ?? 'none'} />
                </span>
                <span style={{ fontSize: '0.844rem', lineHeight: 1.5 }}>{insight.text}</span>
              </span>
            </div>
          ))
        )}
      </div>
    </>
  );
}
