/** Theme, subject management, backup and reset. Nothing decorative. */

import React, { useRef, useState } from 'react';
import { useActions, useDerived, useStore } from '../state/store';
import { useUi } from '../state/ui';
import { Button, IconButton } from '../components/ui/Button';
import { Segmented } from '../components/ui/Segmented';
import { EmptyState } from '../components/ui/EmptyState';
import { BackupDialog, type BackupMode } from '../components/forms/BackupDialog';
import { useToast } from '../components/ui/Toast';
import {
  canPersist,
  exportFileName,
  parseImport,
  serialiseExport,
  DATA_VERSION,
} from '../lib/storage';
import type { ThemePreference } from '../lib/types';
import { formatMinutes, pluralize } from '../lib/utils';

export function SettingsPage() {
  const { data, saveError } = useStore();
  const derived = useDerived();
  const actions = useActions();
  const toast = useToast();
  const { openSubject, askConfirm } = useUi();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [backup, setBackup] = useState<{ open: boolean; mode: BackupMode; reason?: string }>({
    open: false,
    mode: 'copy',
  });

  /**
   * Embedded pages run sandboxed, where a download the page starts is dropped
   * without any error. There the backup is offered as copyable text instead.
   */
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
      askConfirm({
        title: 'Replace everything with this backup?',
        message: `The file holds ${report.subjects} ${pluralize(report.subjects, 'subject')}, ${report.assessments} ${pluralize(report.assessments, 'assessment')}, ${report.studyLogs} study ${pluralize(report.studyLogs, 'log')} and ${report.goals} ${pluralize(report.goals, 'goal')}. Your current data will be replaced.`,
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

  const totalStudy = data.studyLogs.reduce((acc, l) => acc + l.minutes, 0);

  return (
    <div className="page page-transition">
      <div className="stack">
        {saveError && (
          <div className="panel panel--pad enter" style={{ borderColor: 'var(--bad)' }}>
            <p className="tone-bad" style={{ fontWeight: 600 }}>
              {saveError}
            </p>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: 4 }}>
              Export your data now so nothing is lost.
            </p>
          </div>
        )}

        <section className="section enter" style={{ ['--i' as string]: 0 }}>
          <div className="section__head">
            <h2>Appearance</h2>
          </div>
          <div className="panel panel--pad">
            <div className="row row--between row--wrap" style={{ gap: 16 }}>
              <div>
                <p style={{ fontWeight: 560 }}>Theme</p>
                <p className="section__hint">Dark by default. System follows your device.</p>
              </div>
              <Segmented<ThemePreference>
                ariaLabel="Theme"
                value={data.settings.theme}
                onChange={(theme) => actions.updateSettings({ theme })}
                options={[
                  { value: 'system', label: 'System' },
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                ]}
              />
            </div>
            <hr className="divider" style={{ margin: '16px 0' }} />
            <div className="row row--between row--wrap" style={{ gap: 16 }}>
              <div>
                <p style={{ fontWeight: 560 }}>Week starts on</p>
                <p className="section__hint">Used for your weekly study totals.</p>
              </div>
              <Segmented<'mon' | 'sun'>
                ariaLabel="Week starts on"
                value={data.settings.weekStartsOn}
                onChange={(weekStartsOn) => actions.updateSettings({ weekStartsOn })}
                options={[
                  { value: 'mon', label: 'Monday' },
                  { value: 'sun', label: 'Sunday' },
                ]}
              />
            </div>
          </div>
        </section>

        <section className="section enter" style={{ ['--i' as string]: 1 }}>
          <div className="section__head">
            <h2>Manage subjects</h2>
            <Button size="sm" icon="plus" onClick={() => openSubject()}>
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
                onAction={() => openSubject()}
              />
            ) : (
              data.subjects.map((subject, i) => {
                const view = derived.bySubjectId.get(subject.id);
                return (
                  <div
                    key={subject.id}
                    className="list-row enter--fast"
                    style={{ ['--i' as string]: i }}
                  >
                    <span className="list-row__main">
                      <span className="cell-name">{subject.name}</span>
                      <span className="cell-sub">
                        {view?.assessments.count ?? 0}{' '}
                        {pluralize(view?.assessments.count ?? 0, 'assessment')} ·{' '}
                        {formatMinutes(view?.totalMinutes ?? 0)} logged
                      </span>
                    </span>
                    <span className="list-row__side" style={{ gap: 2 }}>
                      <IconButton icon="edit" label={`Edit ${subject.name}`} onClick={() => openSubject(subject)} />
                      <IconButton
                        icon="trash"
                        label={`Delete ${subject.name}`}
                        onClick={() =>
                          askConfirm({
                            title: `Delete ${subject.name}?`,
                            message:
                              'This also removes its assessments, study time and goals. This cannot be undone.',
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

        <section className="section enter" style={{ ['--i' as string]: 2 }}>
          <div className="section__head">
            <div>
              <h2>Your data</h2>
              <p className="section__hint">
                Everything is stored on this device only. Export regularly to keep a backup.
              </p>
            </div>
          </div>
          <div className="panel panel--pad">
            <div className="grid grid--4" style={{ marginBottom: 18 }}>
              <Stat label="Subjects" value={String(data.subjects.length)} />
              <Stat label="Assessments" value={String(data.assessments.length)} />
              <Stat label="Study sessions" value={String(data.studyLogs.length)} />
              <Stat label="Total logged" value={formatMinutes(totalStudy)} />
            </div>

            <div className="row row--wrap" style={{ gap: 9 }}>
              <Button icon="download" onClick={exportData}>
                Export data
              </Button>
              <Button icon="upload" disabled={busy} onClick={() => fileRef.current?.click()}>
                Import data
              </Button>
              <button
                type="button"
                className="link-btn"
                onClick={() => setBackup({ open: true, mode: 'paste' })}
              >
                or paste a backup
              </button>
              <span className="spacer" />
              <Button
                variant="danger"
                icon="refresh"
                onClick={() =>
                  askConfirm({
                    title: 'Reset everything?',
                    message:
                      'Every subject, assessment, study session and goal will be permanently deleted from this device. Export a backup first if you might want it back.',
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

        <section className="section enter" style={{ ['--i' as string]: 3 }}>
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
              <span className="kv__value">
                {canPersist ? 'Local to this browser' : 'Unavailable in this browser'}
              </span>
            </div>
            <div className="kv">
              <span className="kv__key">Accounts</span>
              <span className="kv__value">None — nothing leaves this device</span>
            </div>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: 14 }}>
              This app answers three questions: how you are doing overall, which subject needs you
              most, and whether you are improving. Priorities come from a transparent rule-based
              engine — every reason shown on My Focus is a rule you can read in the code.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="metric__label">{label}</p>
      <p className="num" style={{ fontSize: '1.25rem', fontWeight: 640 }}>
        {value}
      </p>
    </div>
  );
}
