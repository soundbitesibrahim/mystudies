/** The compact subject status table used on Overview and Subjects. */

import React from 'react';
import type { SubjectView } from '../../state/derived';
import { useUi } from '../../state/ui';
import { Meter, PriorityMark, TrendIndicator, scoreTone, toneClass } from '../../components/ui/Indicators';

export function SubjectTable({ views }: { views: SubjectView[] }) {
  const ui = useUi();

  return (
    <div className="table-wrap">
      <table className="data stackable">
        <caption className="sr-only">Status of every subject you track</caption>
        <thead>
          <tr>
            <th scope="col">Subject</th>
            <th scope="col" className="td-right">
              Current
            </th>
            <th scope="col" className="td-right">
              Target
            </th>
            <th scope="col" className="td-right">
              Syllabus
            </th>
            <th scope="col" className="td-right">
              Mastery
            </th>
            <th scope="col">Trend</th>
            <th scope="col">Priority</th>
          </tr>
        </thead>
        <tbody>
          {views.map((view, i) => (
            <tr
              key={view.subject.id}
              className="enter--fast is-clickable"
              style={{ ['--i' as string]: i }}
              tabIndex={0}
              role="link"
              onClick={() => ui.openSubjectDetail(view.subject.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  ui.openSubjectDetail(view.subject.id);
                }
              }}
            >
              <td data-label="" className="stack-title">
                <span className="cell-name">{view.subject.name}</span>
                {view.subject.code && <span className="cell-sub mono"> {view.subject.code}</span>}
              </td>
              <td data-label="Current" className="td-right num">
                {view.currentPercent === null ? (
                  <span className="faint">No data</span>
                ) : (
                  <>
                    <span className={toneClass(view.currentPercent)} style={{ fontWeight: 560 }}>
                      {view.currentGrade}
                    </span>{' '}
                    <span className="faint">{view.currentPercent}%</span>
                  </>
                )}
              </td>
              <td data-label="Target" className="td-right num">
                {view.targetGrade ?? (view.targetPercent === null ? <span className="faint">—</span> : `${view.targetPercent}%`)}
                {view.gap !== null && view.gap > 0 && (
                  <span className="cell-sub"> · {view.gap} to go</span>
                )}
              </td>
              <td data-label="Syllabus" className="td-right">
                {view.coverage === null ? (
                  <span className="faint">—</span>
                ) : (
                  <span className="row" style={{ justifyContent: 'flex-end', gap: 8 }}>
                    <span className="num faint">{Math.round(view.coverage * 100)}%</span>
                    <span style={{ width: 44 }}>
                      <Meter value={view.coverage * 100} label={`${view.subject.name} syllabus coverage`} />
                    </span>
                  </span>
                )}
              </td>
              <td data-label="Mastery" className="td-right num">
                {view.mastery === null ? (
                  <span className="faint">—</span>
                ) : (
                  <span className={toneClass(view.mastery)} style={{ fontWeight: 560 }}>
                    {view.mastery}%
                  </span>
                )}
              </td>
              <td data-label="Trend">
                <TrendIndicator
                  direction={view.trend.direction}
                  delta={view.trend.delta}
                  note={view.trend.note}
                  showLabel={false}
                />
              </td>
              <td data-label="Priority">
                <PriorityMark level={view.priority.level} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
