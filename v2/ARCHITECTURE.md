# Incremental migration architecture

## Boundaries

```text
src/
  App.tsx                    application orchestration and session lifecycle
  components/
    Shell.tsx                navigation, mobile drawer and application chrome
    ui.tsx                   button, badge, empty state and Radix dialog primitives
  domain/
    types.ts                 original JSON + additive typed session contracts
    engine.ts                pure eligibility, timing, validation, scoring, merging
    revision.ts              exact legacy card identities, schedules and Anki format
    sample.ts                original, explicitly unreviewed sample questions
    prompts.ts               source-aware authoring and independent-review prompts
  repositories/
    storage.ts               localStorage, import, backup and recovery adapters
  features/
    Dashboard.tsx
    Library.tsx
    TestBuilder.tsx
    PromptBuilder.tsx        specifications → copy prompt → import AI JSON
    Workspace.tsx
    Revision.tsx
    History.tsx
    Settings.tsx
```

Feature screens load on demand. Domain logic has no React or DOM dependency. The storage adapter owns persistence and has deterministic recovery tests. Components use React's safe text rendering, not raw imported HTML. Dialog primitives use Radix; the design is customized rather than a default component-library theme. Tailwind v4 provides the styling pipeline; semantic CSS tokens and classes define the application design. Motion supplies transitions and respects reduced-motion preferences. Fonts are bundled locally.

The current App orchestrator is the next extraction point for a dedicated session-controller hook when backend authoring or additional session policies are introduced.

## Compatibility contracts

| Data | Contract |
| --- | --- |
| `testit_quiz_*` | Remains the bank/legacy-practice store. React sessions never rewrite bank answers. Concept editing intentionally changes only the selected concept and saved timestamp. |
| `testit_qbank_v1` | Remains a version-1 attempt store. `eliminated` is additive and optional; older validators ignore it and backup/merge preserves it. |
| Original option keys | Remain the saved answer identity; displayed A/B/C letters are presentation only. |
| Question identities | Exact `JSON.stringify([bankKey, String(questionId)])` convention. |
| `testit_revision_v1` | Exact original card identity including bank, question ID and three concept strings. Existing intervals and due dates remain valid. |
| `testit_anki_deck` | Preserved in backups; the original legacy deck remains accessible in the compatibility app. |
| `testit_prompt_presets` | Retained unchanged in backups; original prompt builder remains available. |
| Backup | Version 1 with studyProgress, customData, settings and recoveryRaw. Credential and unrelated keys are rejected. |
| OAuth credentials | Not included in portable backups. Google is accessed through the unchanged compatibility app. |

Identical JSON reimport returns the existing bank. Changed imports create new keys. Unknown JSON fields survive import and snapshotting. Metadata defaults are resolved into new question snapshots without modifying their source bank.

## Sessions and failure handling

Each successful interaction writes an attempt revision. Timing uses timestamp deltas, not interval counts. Five-second checkpoints bound ordinary crash recovery; active timestamps account for elapsed wall time after a crash. Suspend and page lifecycle events pause and persist. Browsers cannot guarantee final writes during abrupt termination.

Tutor answers lock on submission. Exam answers lock on completion. Timer expiry prevents a stale input event from modifying a newly completed session. Completed questions still permit bookmarks/highlights, with immutable answer history.

Storage failure keeps the current session in memory, displays a persistent warning and offers Retry / Export recovery. Leaving the session is blocked until a save succeeds. Recovery export includes unsaved state. No code removes unrelated banks to make space.

Backup restore validates all records first, requires a recovery snapshot, then writes. On failure, it attempts to restore previous values and reports incomplete rollback explicitly. Restore overlays matching records and retains records absent from the backup, matching legacy behavior. Malformed raw data is retained for manual recovery.

Divergent attempt branches are preserved as recovery copies. A browser-tab lease discourages simultaneously opening the same session in React tabs; storage events suspend an active session when another tab writes test data. These are safeguards, not atomic distributed locking. Older clients do not participate in leases; users should avoid editing the same session in multiple versions/devices. A transactional database/sync protocol is a separate milestone.

## Preservation and rollback

The repository root contains the static React release for GitHub Pages. Editable source remains in `v2/`; the original interface is preserved in `legacy/`. Build with `npm run build`, verify with `npm run test:release`, then stage root artifacts with `npm run release:stage`. The existing main-branch Pages deployment serves those artifacts.

To return to the original interface, open `legacy/index.html`. New attempts remain readable by the preserved question-bank implementation. Export a recovery backup first if a write has failed. The old UI does not expose answer elimination but retains the additive field when serializing snapshots. The archive branch at the pre-migration production SHA supports a full code rollback without deleting browser data.

Different origins do not share storage. Restoring a hosted backup into a local preview is an explicit copy, not live synchronization with production.

## Subsequent milestones

1. **Medical authoring:** objective blueprints, jurisdiction/level-of-care profiles, source packets, independent reviewer output, deterministic checks, reference verification and accountable human approval. Authoring needs its own versioned schema and backup/sync negotiation; do not append incompatible data to the existing envelope silently.
2. **Authenticated authoring service:** server-side provider credentials, retrieval, audit history and durable jobs. Never embed provider secrets in the static Pages build. Preserve manual prompt/import as an option.
3. **Storage migration:** introduce repository interfaces over transactional IndexedDB, copy/validate with a migration journal, then switch the active-store marker. Keep source records and a recovery reader; avoid simultaneous UI/storage cutovers.
4. **Google integration:** extract the existing implementation behind an adapter, then validate authenticated sign-in, transfers, failure cases and simultaneous devices on an authorized origin.
5. **Offline housekeeping:** the cutover now includes versioned offline assets, explicit save/reload updates, isolated legacy caches, preserved manifest identity and tests against the previous production worker. A retention policy for older caches is still a separate decision.
6. **Clinical analytics:** separate first-pass and repeat performance, show denominators, and add item statistics only when sample size and study conditions support interpretation.

Before production cutover, verify representative real backups, multiple question banks with overlapping IDs, historical option mappings, large banks/storage limits, touch selection on real iOS/Android devices, assistive technology, live Google OAuth and stale service-worker updates. Local browser checks do not establish clinical validity or WCAG conformance.
