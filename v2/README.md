# TESTIT 2.0

A React + TypeScript + Vite application. The repository root contains the production static build for GitHub Pages. Editable source lives in `v2/`; the preserved original interface lives in `legacy/`.

## Run locally

Requires a current Node.js installation. Dependencies are already installed in this development checkout.

```powershell
cd v2
npm.cmd run dev
```

Open the Local URL printed by Vite (normally `http://127.0.0.1:5173`). `npm.cmd` avoids Windows PowerShell's restriction on running `npm.ps1`. On other shells, ordinary `npm` works.

On a fresh clone, run `npm.cmd ci` before starting. `package-lock.json` pins the installed dependency graph.

For a production build and local preview:

```powershell
npm.cmd run build
npm.cmd run preview
```

The output is `v2/dist/`. Relative assets support the existing `/testit/` Pages subdirectory; hash navigation avoids server rewrite requirements. After testing, run `npm.cmd run release:stage` from `v2/` to update the checked-in root build, then publish the reviewed changes. No hosting configuration change is required for the existing branch deployment.

## Bring your existing data

Browser storage belongs to its **origin**, including port. A local preview cannot automatically read data stored on GitHub Pages or another localhost port.

1. Export a backup from the original hosted TESTIT.
2. Open the local React application in a separate browser profile if testing with a copy of real data.
3. Choose **Settings & data → Restore backup**.
4. Verify banks, revision cards, previous sessions and schedules before studying.

The development application reads and writes the original storage keys. When both versions run on the same origin, they share study data. This also means the compatibility route is not an isolated data sandbox. Suspend active sessions before opening Google sync or another version.

## Working features

The question generator uses the [clinical authoring standard](PROMPT-QUALITY.md): objective-led cases, meaningful discrimination between competing answers, all-option teaching explanations, and jurisdiction-aware independent review prompts. Regenerate your prompt to apply it; existing question banks are unchanged.

- **Create questions with AI:** native specification form (topic, curriculum, discipline/system, count, options, difficulty, question styles, objectives, source notes and custom instructions), generated prompt with clipboard/download, saved specifications, optional independent-review prompt, and pasted/uploaded AI JSON import. Find it in the sidebar, dashboard, library, or the Create a test screen. Imported banks are immediately available for practice and concept revision. Saved specifications use the existing backed-up `testit_prompt_presets` store and can load legacy presets.

- Expressive responsive dashboard, searchable bank library, session history and dark appearance.
- Test builder with bank/system selection, All/Unused/Incorrect/Bookmarked pools, counts, names, tutor/exam modes and independent timing.
- Stable shuffled question and option order, immutable attempt snapshots, original answer identities and bank-scoped IDs.
- Question highlighting, answer elimination, bookmarks, keyboard shortcuts, per-question timing, desktop explanation pane and mobile question/explanation tabs.
- Explicit Tutor submission; Exam answer editing with explanations withheld until completion.
- Timestamp-based timing; suspend/resume; action saves, five-second checkpoints, reload recovery and expiry finalization.
- Completed-session results and All/Incorrect/Omitted/Bookmarked question review filters.
- Native concept revision with the existing key and interval rules, Again repetition, concept editing and filtered Anki Basic/Basic + Extra text downloads.
- Existing question JSON import, optional metadata, duplicate-import reuse, unknown-field preservation and original progress retention.
- Version-1 backup export/restore, complete validation before writes, recovery snapshots, rollback and unsaved-session recovery export.
- Original Google sign-in and Drive sync through the preserved compatibility application. Live authenticated OAuth/Drive transfer has not been tested in this development environment.
- Bundled typography, reduced-motion support, keyboard-operable controls, focus-trapped dialogs and mobile app navigation.

The builder starts new practice sessions; it does not reset imported banks or legacy practice answers. Existing legacy practice can still be resumed through the original application. Imported explanations are never rewritten or fabricated. Missing individual distractor explanations are identified explicitly.

## Original application

`scripts/prepare-legacy.mjs` copies the preserved `legacy/` source into the ignored `public/legacy/` directory before development/build. The compatibility route is `./legacy/index.html`. Its worker uses isolated cache names so it cannot delete the new app's offline shell.

Use **Original TESTIT** for advanced legacy workflows, adding cards to older quizzes, Google connection and Drive synchronization. The original prompt builder also remains available; the primary AI prompt workflow is native to React. Both interfaces have separately scoped offline caches. The React worker waits for **Save & reload** before activating an update over an existing installation.

The root website is the React production build. The root authentication callback and icons retain their existing URLs. Original source and regression tests remain in `legacy/` and `tests/`. The pre-migration production commit is retained in Git history and an archive branch for rollback.

## Verification

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
npm.cmd run test:release
```

Browser tests serve the production build on a temporary loopback port and launch installed Microsoft Edge in a fresh, isolated browser context. They do not use your browser profile or Google account. `TESTIT_BROWSER` can override the Edge executable path. The browser and temporary server close after the run. Screenshots go to ignored `v2/test-artifacts/`.

Run original regression tests from the repository root:

```powershell
node --test tests/qbank-core.test.cjs
$env:TESTIT_PLAYWRIGHT = (Resolve-Path v2/node_modules/playwright-core).Path
node tests/browser-workflows.cjs
```

## Deliberate migration boundaries

This increment migrates the study application and compatibility layer. It does not yet move storage to IndexedDB, replace Google OAuth/Drive code, automate AI generation, verify medical references, or establish clinician approval. Those need their own tested milestones; no clinical approval is implied by the interface. The bundled original physiology questions are marked unreviewed.

The React shell is an installable PWA with bundled fonts and cached routes. The release test installs the actual previous production worker under `/testit/`, updates to React, verifies preservation of study records, saves an active answer at the update boundary, and reloads the shell and revision route offline. Google and AI services still need connectivity. Caches are retained conservatively during the first cutover.

See [ARCHITECTURE.md](ARCHITECTURE.md) for data contracts, rollback and subsequent milestones.
