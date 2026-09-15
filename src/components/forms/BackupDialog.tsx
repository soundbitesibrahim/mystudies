/**
 * Copy-and-paste backup, for when a file download cannot be delivered.
 *
 * Sandboxed embeds (and some locked-down browsers) silently drop downloads
 * started by a page, so the same backup is always reachable as text.
 */

import React, { useEffect, useRef, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { useActions, useStore } from '../../state/store';
import { useToast } from '../ui/Toast';
import { useUi } from '../../state/ui';
import { parseImport, serialiseExport } from '../../lib/storage';
import { pluralize } from '../../lib/utils';

export type BackupMode = 'copy' | 'paste';

interface BackupDialogProps {
  open: boolean;
  mode: BackupMode;
  /** Explains why the dialog opened, when a download could not be delivered. */
  reason?: string;
  onClose: () => void;
}

export function BackupDialog({ open, mode, reason, onClose }: BackupDialogProps) {
  const { data } = useStore();
  const actions = useActions();
  const toast = useToast();
  const { askConfirm } = useUi();
  const copyRef = useRef<HTMLTextAreaElement>(null);
  const [pasted, setPasted] = useState('');

  useEffect(() => {
    if (open) setPasted('');
  }, [open]);

  const backup = open && mode === 'copy' ? serialiseExport(data) : '';

  const copy = async () => {
    const field = copyRef.current;
    if (!field) return;
    field.select();
    try {
      await navigator.clipboard.writeText(field.value);
      toast.success('Backup copied to the clipboard');
      return;
    } catch {
      // Clipboard access can be blocked; fall back to the legacy command.
    }
    try {
      if (document.execCommand('copy')) {
        toast.success('Backup copied to the clipboard');
        return;
      }
    } catch {
      /* ignore */
    }
    toast.info('Copying is blocked here — the text is selected, press Ctrl/Cmd + C');
  };

  const restore = () => {
    const result = parseImport(pasted);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    const { data: imported, report } = result;
    onClose();
    askConfirm({
      title: 'Replace everything with this backup?',
      message: `This backup holds ${report.subjects} ${pluralize(report.subjects, 'subject')}, ${report.assessments} ${pluralize(report.assessments, 'assessment')}, ${report.studySessions} study ${pluralize(report.studySessions, 'session')} and ${report.goals} ${pluralize(report.goals, 'goal')}. Your current data will be replaced.`,
      confirmLabel: 'Import and replace',
      onConfirm: () => {
        actions.replaceData(imported);
        toast.success(`Imported ${report.subjects} ${pluralize(report.subjects, 'subject')}`);
      },
    });
  };

  return (
    <Modal
      open={open}
      title={mode === 'copy' ? 'Copy your backup' : 'Paste a backup'}
      subtitle={
        mode === 'copy'
          ? reason || 'Keep this text somewhere safe — it restores everything.'
          : 'Paste the backup text you saved earlier.'
      }
      onClose={onClose}
      footer={
        <>
          <span className="spacer" />
          <Button onClick={onClose}>Close</Button>
          {mode === 'copy' ? (
            <Button variant="primary" icon="check" onClick={copy}>
              Copy to clipboard
            </Button>
          ) : (
            <Button variant="primary" icon="upload" disabled={!pasted.trim()} onClick={restore}>
              Restore backup
            </Button>
          )}
        </>
      }
    >
      {mode === 'copy' ? (
        <div className="field">
          <label className="field__label" htmlFor="backup-copy">
            Backup data
            <span className="field__hint">JSON · select all and copy</span>
          </label>
          <textarea
            id="backup-copy"
            ref={copyRef}
            className="textarea"
            style={{ minHeight: 220, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.75rem' }}
            readOnly
            value={backup}
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      ) : (
        <div className="field">
          <label className="field__label" htmlFor="backup-paste">
            Backup data
            <span className="field__hint">paste the JSON you copied</span>
          </label>
          <textarea
            id="backup-paste"
            className="textarea"
            style={{ minHeight: 220, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '0.75rem' }}
            placeholder='{ "app": "academic-command-center", ... }'
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
          />
        </div>
      )}
    </Modal>
  );
}
