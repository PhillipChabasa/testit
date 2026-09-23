# TESTIT — Playful Geometric Edition

This update adds concept-based revision to the existing TESTIT app. The AI workflow remains external: create a prompt, paste it into your AI, then import its JSON response. No API key or AI subscription is configured inside this app.

## Design update

The entire app now follows Playful Geometric: cream paper backgrounds, violet primary actions, pink/yellow/mint accents, geometric decorations, dark 2px borders, pill buttons, asymmetric concept cards, and hard offset shadows. The same visual system covers Home, Quizzes, Practice, Create, Revision, Results, Settings, the sign-in page, and the app icons.

The implementation keeps the existing plain HTML/CSS/JavaScript structure. Shared design tokens are centralised at the top of the main stylesheet; dark-mode and small-screen token adjustments are grouped there. Revision and the home hero use named component classes, with no new frontend framework or UI-library dependency.

Outfit is used for headings and Plus Jakarta Sans for body text, with system-font fallbacks offline. Primary action backgrounds use a slightly deeper violet for readable white button labels. Motion is disabled when reduced motion is preferred. Mobile content stacks, decorative hero artwork is hidden, and primary controls use at least 48px touch targets. MCQ options and question navigation are native keyboard-accessible buttons.

The concept-card, revision, backup and Anki export features from the previous update are retained. Automated logic checks were rerun after the redesign. CSS/HTML structure and key colour contrasts were checked; browser visual/device verification remains outstanding because the browser runtime is unavailable in this environment.

## Start here

1. Extract the complete ZIP.
2. For a quick look, open `index.html` in your browser and click **Try a Sample**. The sample includes five MCQs and five separate concept cards.
3. For normal use, update your existing HTTPS-hosted TESTIT app with the extracted files. Keep its existing URL/origin to retain browser data and the existing Google OAuth setup. Before updating, use **Settings → Export Backup** in the old app.
4. Visit **Revision**, choose a quiz or all saved quizzes, choose a practice filter, and start.

The complete package contains `index.html`, `sw.js`, `manifest.json`, `auth.html`, `404.html`, `_redirects`, and both required PNG icons in `icons/`. Upload the folder contents with these exact names. The previous uploaded names such as `index(2).html` and `sw(1).js` have been normalised for deployment.

Opening the HTML directly is suitable for a preview. Offline installation, reliable origin-based storage, service workers, and Google sign-in require a supported hosted origin or a local development server. A different host/origin gets separate browser storage; transfer your data with Export Backup / Import Backup when moving hosts.

## Create a new quiz and its concept cards

1. Choose **Create**, enter a topic or source material, and generate the prompt.
2. Copy the prompt into your AI tool. Every MCQ now requires one `concept_card` with **question**, **answer**, and **explanation**.
3. Copy the AI's JSON response.
4. Click **Import AI response** and paste it, or choose a `.json` file. Click **Load Quiz**.
5. Answer an MCQ. Expand **Learn the concept** to see its linked short-answer card.

Concept cards test the underlying idea. They do not repeat the answer options or use the correct option letter. The prompt requests one focused idea, complete sentences, short answers, and reasoning in the explanation.

The app checks field structure; it cannot verify the AI's factual accuracy. Review the cards and use **Edit card** to correct or refine them.

### JSON shape

```json
{
  "title": "My quiz",
  "questions": [
    {
      "id": 1,
      "question": "The MCQ question goes here.",
      "options": {"a": "Option one", "b": "Option two"},
      "correct_answer": "a",
      "explanation": "The MCQ explanation goes here.",
      "tags": ["topic"],
      "concept_card": {
        "question": "What is the underlying concept?",
        "answer": "A short, fully worded answer goes here.",
        "explanation": "The reasoning and useful context go here."
      }
    }
  ]
}
```

## Revision mode

- **Due + new cards:** cards ready for review now, including cards not previously rated.
- **All concepts:** practice any attached concept card, even if it is scheduled later.
- **Missed MCQs:** cards attached to questions currently answered incorrectly.
- **Flagged MCQs:** cards attached to flagged questions.

Think of an answer, reveal it, then rate your recall:

| Rating | Next review |
| --- | --- |
| Again | Repeats later in the same session; also due in 10 minutes |
| Hard | 1 day |
| Good | Starts at 2 days, then doubles the previous interval |
| Easy | Starts at 4 days, then triples the previous interval |

Skip leaves the rating unchanged. Editing a card starts a fresh schedule for its updated content. Keyboard shortcuts: Space reveals; 1–4 rate Again, Hard, Good, Easy.

This is a simple interval-based scheduler, not Anki's scheduling algorithm. Ratings are saved locally and included in TESTIT backups. When Google Drive sync is configured, review records participate in sync; the latest rating for each identical card wins.

## Export to Anki

Exports contain the **selected quiz and practice filter**, independent of how far you have progressed through the current session. Select **All concepts** to export every attached card. Cards missing from older quizzes are omitted, not replaced with MCQs.

The downloaded `.txt` file is UTF-8, tab-separated, with Anki file headers. It is an importable text file, not an `.apkg` deck package. Text content and tags transfer; revision schedules and MCQ history do not.

### Option 1: Basic + Extra — separate fields

1. Click **Export Basic + Extra**.
2. In Anki Desktop, choose **File → Import** and select the downloaded `.txt`.
3. Choose your existing Basic + Extra note type and map **Question**, **Answer**, **Explanation**, and **Tags** to its corresponding fields.
4. Confirm **Tab** as separator and **Allow HTML in fields** is enabled. Inspect the import preview before importing.

If you need a new note type, clone Basic, rename Front to Question and Back to Answer, then add Explanation. Use these card templates:

Front:

```html
{{Question}}
```

Back:

```html
{{FrontSide}}
<hr id="answer">
{{Answer}}
<br><br>
{{Explanation}}
```

### Option 2: standard Basic — easiest setup

Click **Export standard Basic**. Import using Anki's Basic note type, with Front → Front, Back → Back, and Tags → Tags. The back includes both the answer and explanation.

Anki normally detects duplicate notes by the first field. Review the duplicate/match-scope options when importing. Identical concept questions from different quizzes may match an existing note.

Reference: [Anki Manual — Text Files](https://docs.ankiweb.net/importing/text-files.html).

## Add cards to older quizzes

1. In **Revision**, select one specific quiz.
2. Open **Older quiz without cards? → Add missing concept cards**.
3. Copy the prepared prompt into your AI tool.
4. Paste the returned JSON into the same dialog and click **Attach cards**.

The response must contain exactly one valid card for each missing MCQ ID. The app attaches the cards while keeping MCQs, saved answers, and flags. Existing MCQ-style entries from the old Anki export remain in backups but are not mixed into concept exports.

## Saved answer correction

This version stores the original option identity and maps it back to the displayed option after shuffling. New answers therefore retain their correctness when reopening a quiz. Historical answers already saved incorrectly by the previous implementation cannot be reconstructed reliably; reset and retake an affected old quiz if its score looks inconsistent.

## Hosting, offline use and Google sign-in

The existing Google client ID and sign-in implementation are retained. If moving to another domain, its origin must be allowed in that Google OAuth client's configuration. Live Google sign-in was not verified during this update.

Serve the entire package over HTTPS. After the app shell has cached successfully, study and revision can run offline. External AI generation and Drive sync need a connection. Icons required by the service worker are included. The cache version is updated so browsers can retrieve this revision.

For local testing with Python installed, run this from the extracted folder:

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000`. Google OAuth may require an authorised origin for local sign-in.

## Validation performed

- JavaScript parsing and startup logic in a simulated DOM.
- Sample import with one concept per MCQ.
- Stable scores across 30 reshuffled reloads.
- All, missed, flagged and due filters.
- Reveal/rate behaviour, persistence, and Again repetition.
- Backup/restore inclusion and review-record conflict merging.
- Legacy quiz conversion and card editing.
- Rejection of malformed concept fields and duplicate IDs.
- Prompt generation and critic preservation of concept cards.
- Independent tab-separated export parsing, including quotes, tabs, Unicode, line breaks and HTML escaping.

Browser visual/device checks, an actual Anki import, hosted service-worker behaviour, and live Google OAuth/Drive sync were not run. The browser runtime could not be installed in the build environment.
