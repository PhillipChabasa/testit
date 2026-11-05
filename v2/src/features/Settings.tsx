import { useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  Cloud,
  Download,
  FileJson,
  FolderHeart,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Badge, Button, Modal } from "../components/ui";
import {
  buildBackup,
  download,
  parseBackup,
  restoreBackup,
} from "../repositories/storage";
import type { Backup } from "../domain/types";
export function Settings({
  onRefresh,
  onError,
}: {
  onRefresh: () => void;
  onError: (s: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null),
    [pending, setPending] = useState<Backup | null>(null),
    [restored, setRestored] = useState(false);
  function exportBackup() {
    try {
      download(
        "testit_backup_" + new Date().toISOString().slice(0, 10) + ".json",
        JSON.stringify(buildBackup(), null, 2),
        "application/json",
      );
    } catch (e) {
      onError((e as Error).message);
    }
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">YOUR LEARNING, LOOKED AFTER</div>
          <h1>
            A safe home for your progress<span className="violet">.</span>
          </h1>
          <p>Keep a copy, stay connected, and make this space yours.</p>
        </div>
        <Badge tone="mint">
          <ShieldCheck size={14} />
          Local-first
        </Badge>
      </div>
      <div className="settings-grid">
        <section className="surface settings-card">
          <span className="action-icon lavender">
            <FolderHeart size={25} />
          </span>
          <h2>Your data. Your copy.</h2>
          <p>
            Back up your question banks, saved answers, test sessions,
            highlights, revision schedules and prompt presets.
          </p>
          <div className="settings-actions">
            <Button variant="primary" onClick={exportBackup}>
              <Download size={16} />
              Export backup
            </Button>
            <Button onClick={() => input.current?.click()}>
              <Upload size={16} />
              Restore backup
            </Button>
          </div>
          <input
            ref={input}
            className="sr-only"
            type="file"
            accept=".json,application/json,.txt"
            aria-label="Restore TESTIT backup"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file)
                try {
                  setPending(parseBackup(await file.text()));
                } catch (err) {
                  onError((err as Error).message);
                }
              e.target.value = "";
            }}
          />
          {restored && (
            <p className="success-message">
              <Check size={16} />
              Backup restored successfully.
            </p>
          )}
          <div className="settings-footnote">
            <ShieldCheck size={15} />
            Restore validates first and keeps a recovery snapshot.
          </div>
        </section>
        <section className="surface settings-card">
          <span className="action-icon mint">
            <Cloud size={25} />
          </span>
          <h2>Google Drive, preserved.</h2>
          <p>
            Your original Google sign-in and Drive sync are available in the
            preserved application. They share browser storage with TESTIT 2.0 on
            the same origin.
          </p>
          <a
            className="button secondary"
            href="./legacy/index.html?view=settings"
            target="_blank"
            rel="noreferrer"
          >
            Open Google & sync settings
            <ArrowUpRight size={16} />
          </a>
          <div className="settings-footnote">
            Suspend active tests before syncing. Return here after sync to
            refresh your library.
          </div>
          <Button variant="ghost" onClick={onRefresh}>
            Refresh local data
            <Check size={15} />
          </Button>
        </section>
        <section className="surface settings-card">
          <span className="action-icon peach">
            <FileJson size={25} />
          </span>
          <h2>Compatibility comes first.</h2>
          <p>
            The original question JSON and backup version 1 are supported.
            Existing bank identities, revision schedules, answer mappings and
            attempt snapshots stay intact.
          </p>
          <a
            className="text-link"
            href="./legacy/index.html"
            target="_blank"
            rel="noreferrer"
          >
            Open the original TESTIT
            <ArrowUpRight size={15} />
          </a>
          <div className="settings-footnote">
            The original interface remains available as a fallback. The new app
            saves active sessions before an update reload.
          </div>
        </section>
        <section className="surface settings-card">
          <span className="action-icon blue">
            <ShieldCheck size={25} />
          </span>
          <h2>Transparent content status.</h2>
          <p>
            Imported questions remain available as unreviewed content. TESTIT
            does not infer clinical approval from wording checks or fabricate
            missing explanations.
          </p>
          <p>
            Source verification and a clinician approval service are future
            stages; this release establishes the study and compatibility
            foundation.
          </p>
        </section>
      </div>
      <Modal
        open={!!pending}
        onOpenChange={(v) => {
          if (!v) setPending(null);
        }}
        title="Restore this backup?"
        description="Matching records will be replaced. Records absent from the backup are retained. A recovery snapshot of current data is saved first."
      >
        <p>
          {Object.keys(pending?.studyProgress || {}).length} question banks ·{" "}
          {Object.keys(pending?.customData || {}).length} additional data stores
        </p>
        <div className="dialog-actions">
          <Button onClick={() => setPending(null)}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (pending)
                try {
                  restoreBackup(pending);
                  onRefresh();
                  setRestored(true);
                  setPending(null);
                } catch (e) {
                  onError((e as Error).message);
                }
            }}
          >
            Restore backup
          </Button>
        </div>
      </Modal>
    </div>
  );
}
