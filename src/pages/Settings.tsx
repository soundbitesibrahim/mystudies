/** Theme, grading, recommendation preferences, subjects and your data. */

import React, { useRef, useState } from 'react';
import { useActions, useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { Button, IconButton } from '../components/ui/Button';
import { Segmented } from '../components/ui/Segmented';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';
import { BackupDialog, type BackupMode } from '../components/forms/BackupDialog';
import {
  BACKUP_KEY,
  DATA_VERSION,
  canPersist,
  exportFileName,
  parseImport,
  serialiseExport,
} from '../lib/storage';
import { DEFAULT_THRESHOLDS, GRADES, sortThresholds } from '../lib/grades';
import { DEFAULT_INTERVALS } from '../lib/revision';
import type { ThemePreference } from '../lib/types';
import { clamp, formatMinutes, pluralize } from '../lib/utils';

export function SettingsPage() {
  const { data, saveError } = useStore();
  const derived = useDerived();
  const actions = useActions();
  const toast = useToast();
  const ui = useUi();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<{ open: boolean; mode: BackupMode; reason?: string }>({
    open: false,
    mode: 'copy',
  });

  const settings = data.settings;

  /** Sandboxed pages silently drop downloads, so the text path is the fallback. */
  const downloadsBlocked = (() => {
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  })();

  const exportData = () => {
    if (downloadsBlocked) {
      setBackup({
        open: true,
        mode: 'copy',
        reason: 'Downloads are blocked in an embedded page, so here is the backup as text.',
      });
      return;
    }
    try {
      const blob = new Blob([serialiseExport(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = exportFileName();
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Backup downloaded');
    } catch (err) {
      console.error('[export] failed', err);
      setBackup({
        open: true,
        mode: 'copy',
        reason: 'The download could not be created, so here is the backup as text.',
      });
    }
  };

  const importData = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const result = parseImport(text);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { data: imported, report } = result;
      ui.askConfirm({
        title: 'Replace everything with this backup?',
        message: `The file holds ${report.subjects} ${pluralize(report.subjects, 'subject')}, ${
          report.topics
        } ${pluralize(report.topics, 'topic')}, ${report.assessments} ${pluralize(
          report.assessments,
          'assessment',
        )} and ${report.studySessions} study ${pluralize(report.studySessions, 'session')}.${
          report.migratedFrom ? ` It will be upgraded from version ${report.migratedFrom}.` : ''
        } Your current data will be replaced.`,
        confirmLabel: 'Import and replace',
        onConfirm: () => {
          actions.replaceData(imported);
          toast.success(`Imported ${report.subjects} ${pluralize(report.subjects, 'subject')}`);
        },
      });
    } catch (err) {
      console.error('[import] failed', err);
      toast.error('Could not read that file');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const setThreshold = (grade: string, value: number) => {
    actions.updateSettings({
      gradeThresholds: settings.gradeThresholds.map((t) =>
        t.grade === grade ? { ...t, min: clamp(value, 0, 100) } : t,
      ),
    });
  };

  const hasLegacyBackup = canPersist && !!window.localStorage.getItem(BACKUP_KEY);

  return (
    <div className="page page-transition">
      <div className="stack">
        {saveError && (
          <div className="notice enter" style={{ borderColor: 'var(--risk)' }}>
            <div className="notice__body">
              <strong className="tone-risk">{saveError}</strong>
              <br />
              Export your data now so nothing is lost.
            </div>
          </div>
        )}

        <section className="section enter">
          <div className="section__head">
            <h2>Appearance</h2>
          </div>
          <div className="panel panel--pad">
            <Row
              title="Theme"
              hint="Dark by default. System follows your device."
              control={
                <Segmented<ThemePreference>
                  ariaLabel="Theme"
                  value={settings.theme}
                  onChange={(theme) => actions.updateSettings({ theme })}
                  options={[
                    { value: 'system', label: 'System' },
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                  ]}
                />
              }
            />
            <hr className="rule" style={{ margin: '14px 0' }} />
            <Row
              title="Week starts on"
              hint="Used for your weekly study totals."
              control={
                <Segmented<'mon' | 'sun'>
                  ariaLabel="Week starts on"
                  value={settings.weekStartsOn}
                  onChange={(weekStartsOn) => actions.updateSettings({ weekStartsOn })}
                  options={[
                    { value: 'mon', label: 'Monday' },
                    { value: 'sun', label: 'Sunday' },
                  ]}
                />
              }
            />
          </div>
        </section>

        <section className="section enter" style={{ ['--i' as string]: 1 }}>
          <div className="section__head">
            <div>
              <h2>Grading</h2>
              <p className="section__hint">
                The minimum percentage for each grade. Changing these re-grades every figure in the app.
              </p>
            </div>
            <Button
              size="sm"
              icon="refresh"
              onClick={() => actions.updateSettings({ gradeThresholds: [...DEFAULT_THRESHOLDS] })}
            >
              Reset to default
            </Button>
          </div>
          <div className="panel panel--pad">
            <div className="form-grid">
              {sortThresholds(settings.gradeThresholds).map((threshold) => (
                <div className="field" key={threshold.grade}>
                  <label className="field__label" htmlFor={`grade-${threshold.grade}`}>
                    Grade {threshold.grade}
                    <span className="field__hint">minimum %</span>
                  </label>
                  <input
                    id={`grade-${threshold.grade}`}
                    className="input"
                    type="number"
                    min={0}
                    max={100}
                    value={threshold.min}
                    disabled={threshold.grade === 'F'}
                    onChange={(e) => setThreshold(threshold.grade, Number(e.target.value))}
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section enter" style={{ ['--i' as string]: 2 }}>
          <div className="section__head">
            <div>
              <h2>Study and recommendations</h2>
              <p className="section__hint">How the focus engine weighs things, and how long sessions default to.</p>
            </div>
          </div>
          <div className="panel panel--pad">
            <div className="form-grid">
              <div className="field">
                <label className="field__label" htmlFor="default-session">
                  Default session length
                  <span className="field__hint">minutes</span>
                </label>
                <input
                  id="default-session"
                  className="input"
                  type="number"
                  min={5}
                  max={180}
                  value={settings.defaultSessionMinutes}
                  onChange={(e) =>
                    actions.updateSettings({ defaultSessionMinutes: clamp(Number(e.target.value), 5, 180) })
                  }
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="daily-target">
                  Daily study target
                  <span className="field__hint">minutes</span>
                </label>
                <input
                  id="daily-target"
                  className="input"
                  type="number"
                  min={0}
                  max={720}
                  value={settings.dailyTargetMinutes}
                  onChange={(e) =>
                    actions.updateSettings({ dailyTargetMinutes: clamp(Number(e.target.value), 0, 720) })
                  }
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="exam-horizon">
                  Exam horizon
                  <span className="field__hint">days before an exam lifts priority</span>
                </label>
                <input
                  id="exam-horizon"
                  className="input"
                  type="number"
                  min={1}
                  max={365}
                  value={settings.examHorizonDays}
                  onChange={(e) =>
                    actions.updateSettings({ examHorizonDays: clamp(Number(e.target.value), 1, 365) })
                  }
                />
              </div>

              <div className="field">
                <label className="field__label" htmlFor="weakness-bias">
                  Weakness bias
                  <span className="spacer" />
                  <span className="num">{settings.weaknessBias}</span>
                </label>
                <input
                  id="weakness-bias"
                  className="slider"
                  type="range"
                  min={0}
                  max={100}
                  value={settings.weaknessBias}
                  style={{ ['--fill' as string]: `${settings.weaknessBias}%` }}
                  onChange={(e) => actions.updateSettings({ weaknessBias: Number(e.target.value) })}
                />
                <span className="field__hint">
                  Higher pushes weak topics further up the list; lower spreads recommendations out.
                </span>
              </div>

              <div className="field span-2">
                <label className="field__label" htmlFor="revision-intervals">
                  Revision intervals
                  <span className="field__hint">days between reviews, comma separated</span>
                </label>
                <input
                  id="revision-intervals"
                  className="input"
                  defaultValue={settings.revisionIntervals.join(', ')}
                  onBlur={(e) => {
                    const parsed = e.target.value
                      .split(',')
                      .map((v) => Math.round(Number(v.trim())))
                      .filter((n) => Number.isFinite(n) && n > 0 && n <= 365);
                    actions.updateSettings({
                      revisionIntervals: parsed.length ? parsed : [...DEFAULT_INTERVALS],
                    });
                    toast.info('Revision intervals updated');
                  }}
                />
              </div>

              <div className="field span-2">
                <label className="row" style={{ gap: 8, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={settings.includeNotStarted}
                    onChange={(e) => actions.updateSettings({ includeNotStarted: e.target.checked })}
                  />
                  <span style={{ fontSize: '0.875rem' }}>
                    Recommend topics you have not started yet
                  </span>
                </label>
              </div>
            </div>
          </div>
        </section>

        <section className="section enter" style={{ ['--i' as string]: 3 }}>
          <div className="section__head">
            <h2>Manage subjects</h2>
            <Button size="sm" icon="plus" onClick={() => ui.openSubject()}>
              Add subject
            </Button>
          </div>
          <div className="panel">
            {!data.subjects.length ? (
              <EmptyState
                icon="book"
                title="No subjects yet"
                text="Add your subjects to begin tracking your academic status."
                actionLabel="Add subject"
                onAction={() => ui.openSubject()}
              />
            ) : (
              data.subjects.map((subject, i) => {
                const view = derived.bySubjectId.get(subject.id);
                return (
                  <div key={subject.id} className="list-row enter--fast" style={{ ['--i' as string]: i }}>
                    <span className="list-row__main">
                      <span className="cell-name">
                        {subject.name}
                        {subject.code && <span className="mono faint"> {subject.code}</span>}
                      </span>
                      <span className="cell-sub">
                        {view?.topics.length ?? 0} {pluralize(view?.topics.length ?? 0, 'topic')} ·{' '}
                        {view?.assessments.length ?? 0} {pluralize(view?.assessments.length ?? 0, 'assessment')} ·{' '}
                        {formatMinutes(view?.totalMinutes ?? 0)} logged
                      </span>
                    </span>
                    <span className="list-row__side" style={{ gap: 2 }}>
                      <IconButton icon="edit" label={`Edit ${subject.name}`} onClick={() => ui.openSubject(subject)} />
                      <IconButton
                        icon="trash"
                        label={`Delete ${subject.name}`}
                        onClick={() =>
                          ui.askConfirm({
                            title: `Delete ${subject.name}?`,
                            message:
                              'This also removes its syllabus, assessments, study sessions, goals and exams. This cannot be undone.',
                            confirmLabel: 'Delete subject',
                            onConfirm: () => actions.deleteSubject(subject.id),
                          })
                        }
                      />
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className="section enter" style={{ ['--i' as string]: 4 }}>
          <div className="section__head">
            <div>
              <h2>Your data</h2>
              <p className="section__hint">
                Stored on this device only. No account, no backend, nothing leaves your browser.
              </p>
            </div>
          </div>
          <div className="panel panel--pad">
            <div className="grid grid--4" style={{ marginBottom: 16 }}>
              <Stat label="Subjects" value={String(data.subjects.length)} />
              <Stat label="Topics" value={String(data.topics.length)} />
              <Stat label="Assessments" value={String(data.assessments.length)} />
              <Stat label="Sessions" value={String(data.studySessions.length)} />
            </div>

            <div className="row row--wrap" style={{ gap: 8 }}>
              <Button icon="download" onClick={exportData}>
                Export data
              </Button>
              <Button icon="upload" disabled={busy} onClick={() => fileRef.current?.click()}>
                Import data
              </Button>
              <button type="button" className="link-btn" onClick={() => setBackup({ open: true, mode: 'paste' })}>
                or paste a backup
              </button>
              <span className="spacer" />
              <Button
                variant="danger"
                icon="refresh"
                onClick={() =>
                  ui.askConfirm({
                    title: 'Reset everything?',
                    message:
                      'Every subject, syllabus topic, assessment, study session, goal and exam will be permanently deleted from this device. Export a backup first if you might want it back.',
                    confirmLabel: 'Delete everything',
                    onConfirm: () => {
                      actions.resetData();
                      toast.info('All data cleared');
                    },
                  })
                }
              >
                Reset data
              </Button>
            </div>

            {hasLegacyBackup && (
              <p className="faint" style={{ fontSize: '0.719rem', marginTop: 12 }}>
                A copy of your pre-upgrade data is still kept in this browser under{' '}
                <span className="mono">{BACKUP_KEY}</span>, in case anything was lost in the upgrade.
              </p>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="application/json,.json"
              className="sr-only"
              aria-label="Choose a backup file to import"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void importData(file);
              }}
            />
          </div>

          <BackupDialog
            open={backup.open}
            mode={backup.mode}
            reason={backup.reason}
            onClose={() => setBackup((b) => ({ ...b, open: false }))}
          />
        </section>

        <section className="section enter" style={{ ['--i' as string]: 5 }}>
          <div className="section__head">
            <h2>About</h2>
          </div>
          <div className="panel panel--pad">
            <div className="kv">
              <span className="kv__key">Application</span>
              <span className="kv__value">Academic Command Center</span>
            </div>
            <div className="kv">
              <span className="kv__key">Data format</span>
              <span className="kv__value">JSON · version {DATA_VERSION}</span>
            </div>
            <div className="kv">
              <span className="kv__key">Storage</span>
              <span className="kv__value">{canPersist ? 'Local to this browser' : 'Unavailable'}</span>
            </div>
            <p className="muted" style={{ fontSize: '0.844rem', marginTop: 14, lineHeight: 1.6 }}>
              Every score, priority and recommendation comes from readable rules over data you
              entered — see <span className="mono">src/lib/priority.ts</span> and{' '}
              <span className="mono">src/lib/focus.ts</span>. There is no model involved, and the app
              never invents a figure: where the evidence is thin it says so.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Row({ title, hint, control }: { title: string; hint: string; control: React.ReactNode }) {
  return (
    <div className="row row--between row--wrap" style={{ gap: 14 }}>
      <div>
        <p style={{ fontWeight: 540, fontSize: '0.875rem' }}>{title}</p>
        <p className="section__hint">{hint}</p>
      </div>
      {control}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span className="metric__label">{label}</span>
      <span className="metric__value">{value}</span>
    </div>
  );
}
