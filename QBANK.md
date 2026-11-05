# TESTIT question bank — Phase 1

## Preview locally

From the repository directory, run:

```powershell
python -m http.server 8000 --bind 127.0.0.1
```

Open `http://127.0.0.1:8000/?view=qbank` in Edge or Chrome. Choose **Add sample bank**, set the count to 2–4, and start a Tutor test. For an exam, select **Exam** and optionally enable **Timed test**. You can also import existing JSON quizzes through **Import JSON**; they remain available in Quizzes and legacy Practice.

The local preview has separate browser storage from a hosted TESTIT installation. Export a backup on the original origin before moving data. Use a separate browser profile for testing with copies of real data. Google OAuth may require an authorized origin; no OAuth settings were changed.

## What is included

- Create Test: saved banks, subject/system selection, All/Unused/Incorrect/Flagged pools, counts, session name, Tutor/Exam feedback, and independent Timed/Untimed operation.
- Focused player: fixed shuffled order, question navigator, answer selection, flags, question-text highlighting, progress, timer, keyboard shortcuts, detailed explanations, optional option rationales, and linked concept cards.
- Tutor locks each answer only after explicit submission. Exam allows answer changes and reveals explanations only after completion.
- Suspend and resume restore the question, option order, answers, flags, highlights, and clock. Navigating to another app view suspends the test. Reloading/closing checkpoints and suspends when the browser delivers lifecycle events. A crashed browser cannot guarantee a final write; successful action saves and 10-second checkpoints bound recovery. An active timed record counts elapsed wall time until suspended, including time after a crash.
- Timed tests count all active time, including reading explanations; suspension pauses the clock. Expiry finalizes once. Untimed tests display elapsed time.
- Completed results show correct, incorrect, omitted, total score, answered accuracy, and per-question time. Review supports All/Incorrect/Omitted/Flagged filters. Completed answers cannot be changed; flags and highlights can be updated during review.
- Desktop and mobile layouts, a collapsible mobile question navigator, dark mode, native buttons and dialogs, visible focus, and keyboard support.

Keyboard: **1–9** choose an option, **Left/Right** navigate, **F** toggles a flag, **H** highlights selected question text. **Enter** activates the focused control; from the question text it submits a Tutor answer. Shortcuts do not run inside editable fields or the completion dialog.

## Optional JSON metadata

The existing format is unchanged. These optional fields improve filtering and explanation detail:

```json
{
  "title": "Example bank",
  "subject": "Medicine",
  "questions": [{
    "id": 1,
    "system": "Cardiovascular",
    "question": "What is cardiac output?",
    "options": {"a": "Heart rate multiplied by stroke volume", "b": "Heart rate divided by stroke volume"},
    "correct_answer": "a",
    "explanation": "The volume pumped per minute depends on beats per minute and volume per beat.",
    "option_explanations": {"b": "Dividing these quantities does not give a volume per minute."}
  }]
}
```

`subject` and `system` may be strings or arrays of strings, at bank or question level. Question metadata overrides the bank default. Missing metadata appears as **Uncategorized**. Selecting no metadata checkboxes includes all values. Multiple selected subjects are ORed, multiple systems are ORed, and the two groups are intersected. Tags and concept cards remain untouched.

Unused excludes legacy answered questions and questions submitted in Tutor or included in a completed test. Incorrect uses the most recent finalized response. Flagged includes legacy flags and flags in saved attempts. IDs are scoped to their bank, so question ID 1 in two banks remains two distinct questions.

## Data and compatibility safeguards

- Original `testit_quiz_*` records remain question banks. New attempts are immutable question snapshots in the versioned `testit_qbank_v1` store. Creating or completing a test does not modify its bank or legacy answers.
- Existing practice gains additive `sessionVersion`, `presentation`, and `currentQuestionId` fields. Original-option answer identities are retained. Old sessions without presentation metadata establish a stable original order once; their previous random order cannot be recovered.
- Identical JSON reimports resume an existing bank. Changed imports use new unique keys. Legacy Reset saves the previous record and creates a separate practice record.
- Storage failures never prune quizzes. The player keeps unsaved changes in memory, shows an export/retry warning, and includes them in backups. Practice failures also expose a persistent save indicator and include in-memory progress in exports.
- The existing backup envelope stays at version 1; attempts are added under `customData.testit_qbank_v1`. Export includes current in-memory state. Restore validates keys and test records, requires a recovery snapshot, and attempts rollback if any write fails. Under severe storage failure, rollback can also fail; the recovery snapshot is retained and success is not reported.
- Drive sync includes the new store and merges attempts by ID/revision. Divergent branches are kept as suspended recovery copies rather than silently discarded. Sync refreshes its local snapshot after downloading remote data. Legacy quiz sync behavior is retained.
- Use this updated version on all devices that should sync attempts. Older TESTIT clients do not understand the new store and cannot reliably propagate new attempt data.
- The service worker caches all three new assets. Updates wait for a user-selected safe reload boundary instead of activating immediately over an active test.
- Clear Local Data removes TESTIT keys only and clears in-memory sessions.

No UWorld assets, question content, API calls, or credentials are used. TESTIT's original concept revision, Anki export, JSON import, backup controls, and Google sign-in remain available. The sample bank contains original basic physiology/anatomy questions.

Malformed study records are retained as raw recovery text in exported/recovery backups rather than silently omitted. That text is preserved for manual repair; importing a backup does not automatically execute or restore malformed records.

## Validation

Run the pure model checks with the installed Node.js runtime:

```powershell
node --test tests/qbank-core.test.cjs
```

The browser workflow script uses an installed `playwright-core` and Edge. It serves the app on a temporary loopback port, launches an isolated headless browser, uses synthetic questions, and closes both when finished:

```powershell
$env:TESTIT_PLAYWRIGHT = 'C:\path\to\node_modules\playwright-core'
node tests/browser-workflows.cjs
```

Optional `TESTIT_BROWSER` overrides the Edge executable. Screenshots are written to ignored `tests/artifacts/`. No live Google account is required. Drive merge behavior is tested locally; authenticated Drive transfer still needs a signed-in integration check on an authorized origin.
