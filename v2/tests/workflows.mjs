import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
const root = path.resolve(fileURLToPath(new URL("../dist/", import.meta.url))),
  artifacts = fileURLToPath(new URL("../test-artifacts/", import.meta.url));
await fs.mkdir(artifacts, { recursive: true });
let checks = 0;
function ok(value, label) {
  assert.ok(value, label);
  console.log("PASS " + label);
  checks++;
}
const server = http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(
      new URL(req.url, "http://localhost").pathname,
    );
    const target = path.resolve(
      root,
      "." + (pathname.endsWith("/") ? pathname + "index.html" : pathname),
    );
    if (!target.startsWith(root + path.sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    const data = await fs.readFile(target);
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".png": "image/png",
      }[path.extname(target)] || "application/octet-stream",
    );
    res.end(data);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = "http://127.0.0.1:" + server.address().port;
let browser, failurePage;
try {
  browser = await chromium.launch({
    executablePath:
      process.env.TESTIT_BROWSER ||
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1080 },
    acceptDownloads: true,
    reducedMotion: "reduce",
  });
  // Do not contact Google services during automated local checks.
  await context.route(
    /https:\/\/(fonts\.googleapis|fonts\.gstatic|accounts\.google|www\.googleapis)\.com\//,
    (route) => route.abort(),
  );
  const page = await context.newPage(),
    errors = [];
  failurePage = page;
  page.on("pageerror", (e) => errors.push(e.message));
  page.setDefaultTimeout(12000);
  await page.goto(base);
  await page.getByRole("heading", { name: /A clearer path/ }).waitFor();
  ok(
    (await page
      .getByRole("button", { name: "Overview", exact: true })
      .count()) === 1,
    "React dashboard mounts",
  );
  await page.getByRole("button", { name: /Explore the sample bank/ }).click();
  await page.getByText("4", { exact: true }).first().waitFor();
  if (
    await page
      .getByRole("button", { name: "Dismiss notification", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Dismiss notification", exact: true })
      .click();
  await page.screenshot({
    path: path.join(artifacts, "dashboard-desktop.png"),
    fullPage: true,
  });
  const bank = await page.evaluate(() => {
    const key = Object.keys(localStorage).find((k) =>
      k.startsWith("testit_quiz_"),
    );
    return { key, raw: localStorage.getItem(key) };
  });
  ok(!!bank.key, "sample bank stored in original JSON format");
  await page
    .getByRole("button", { name: "Create a test", exact: true })
    .first()
    .click();
  await page.getByLabel("Number of questions").fill("3");
  await page
    .getByPlaceholder("e.g. Morning medicine")
    .fill("Tutor browser check");
  await page.screenshot({
    path: path.join(artifacts, "builder-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .last()
    .click();
  await page.locator("#clinical-question").waitFor();
  const firstStem = await page.locator("#clinical-question").textContent();
  await page.keyboard.press("1");
  ok(
    (await page.getByRole("radio", { checked: true }).count()) === 1,
    "number shortcut selects option",
  );
  await page
    .getByRole("button", { name: "Eliminate option A", exact: true })
    .click();
  ok(
    (await page.getByRole("radio", { checked: true }).count()) === 0,
    "eliminating selected option clears selection explicitly",
  );
  ok(
    (await page
      .getByRole("button", { name: "Restore option A", exact: true })
      .getAttribute("aria-pressed")) === "true",
    "elimination state is accessible",
  );
  await page.keyboard.press("2");
  await page.keyboard.press("f");
  ok(
    (await page
      .getByRole("button", { name: "Remove bookmark", exact: true })
      .count()) === 1,
    "bookmark shortcut works",
  );
  await page.evaluate(() => {
    const el = document.querySelector("#clinical-question"),
      r = document.createRange();
    const first = document
      .createTreeWalker(el, NodeFilter.SHOW_TEXT)
      .nextNode();
    r.setStart(first, 0);
    r.setEnd(first, 15);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
  });
  await page
    .getByRole("button", {
      name: "Highlight selected question text",
      exact: true,
    })
    .click();
  ok(
    (await page.locator("#clinical-question mark").count()) === 1,
    "text highlight persists as safe ranges",
  );
  ok(
    (await page.getByRole("region", { name: "Answer explanation" }).count()) ===
      0,
    "tutor explanation hidden before submission",
  );
  await page
    .getByRole("button", { name: "Submit answer", exact: true })
    .click();
  await page.getByRole("region", { name: "Answer explanation" }).waitFor();
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector(".explanation-pane")).opacity ===
      "1",
  );
  ok(
    (await page.getByRole("radio", { disabled: false }).count()) === 0,
    "tutor locks submitted answers",
  );
  ok(
    (await page.locator(".rationale").count()) === 4,
    "all options have explanation rows",
  );
  await page.screenshot({
    path: path.join(artifacts, "tutor-desktop.png"),
    fullPage: true,
  });
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowLeft");
  ok(
    (await page.locator("#clinical-question").textContent()) === firstStem,
    "question navigation preserves presentation",
  );
  ok(
    (await page.locator("#clinical-question mark").count()) === 1,
    "highlight survives navigation",
  );
  await page.getByRole("button", { name: "Suspend", exact: true }).click();
  await page
    .getByRole("heading", { name: /Your learning, in motion/ })
    .waitFor();
  const snap = await page.evaluate(
    () =>
      Object.values(
        JSON.parse(localStorage.getItem("testit_qbank_v1")).attempts,
      )[0],
  );
  ok(
    snap.status === "suspended" &&
      snap.eliminated[snap.items[0].key]?.length === 1,
    "suspend saves elimination and pauses the timer",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Resume session", exact: true })
    .click();
  await page.locator("#clinical-question").waitFor();
  ok(
    (await page.locator("#clinical-question mark").count()) === 1,
    "reload/resume restores highlight",
  );
  ok(
    (await page.locator("#clinical-question").textContent()) === firstStem,
    "reload/resume restores question and option order",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "phone workspace avoids horizontal overflow",
  );
  await page.getByRole("button", { name: "Explanation", exact: true }).click();
  ok(
    await page.getByRole("region", { name: "Answer explanation" }).isVisible(),
    "phone explanation tab is usable",
  );
  await page.screenshot({
    path: path.join(artifacts, "tutor-mobile-explanation.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Question", exact: true }).click();
  await page.screenshot({
    path: path.join(artifacts, "tutor-mobile-question.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Finish session", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Finish & review", exact: true })
    .click();
  ok(
    await page
      .locator(".study-header")
      .textContent()
      .then((s) => s.includes("Completed")),
    "finish stores completed tutor session",
  );
  await page
    .getByRole("button", { name: "Back to sessions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Concept revision", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Start revision", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Reveal answer", exact: true })
    .click();
  await page.getByRole("button", { name: /Good/ }).click();
  ok(
    (await page.evaluate(
      () =>
        Object.keys(JSON.parse(localStorage.getItem("testit_revision_v1")))
          .length,
    )) === 1,
    "revision rating uses existing schedule store",
  );
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Standard Basic", exact: true })
    .click();
  const anki = await dl;
  const ankiContent = await fs.readFile(await anki.path(), "utf8");
  ok(
    ankiContent.includes("#notetype:Basic") &&
      ankiContent.includes("#separator:Tab"),
    "Anki export downloads compatible text file",
  );
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Settings & data", exact: true })
    .click();
  const backupDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export backup", exact: true })
    .click();
  const backupFile = await backupDownload;
  const backup = JSON.parse(await fs.readFile(await backupFile.path(), "utf8"));
  ok(
    backup.version === 1 &&
      backup.customData.testit_qbank_v1 &&
      backup.customData.testit_revision_v1,
    "backup retains version 1 envelope and study stores",
  );
  await page.getByLabel("Restore TESTIT backup").setInputFiles({
    name: "backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Restore backup", exact: true })
    .click();
  await page.getByText("Backup restored successfully.").waitFor();
  ok(
    await page.evaluate(() => !!localStorage.getItem("testit_prev_backup")),
    "restore saves recovery snapshot",
  );
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page
    .getByRole("button", { name: "Create a test", exact: true })
    .first()
    .click();
  await page.getByLabel("Number of questions").fill("2");
  await page.getByRole("button", { name: /Exam mode/ }).click();
  await page
    .getByPlaceholder("e.g. Morning medicine")
    .fill("Exam browser check");
  await page.getByText("Give yourself a time limit", { exact: true }).click();
  await page.getByLabel("Duration in minutes").fill("0.1");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .last()
    .click();
  await page.locator("#clinical-question").waitFor();
  await page.keyboard.press("1");
  await page.keyboard.press("2");
  ok(
    (await page.getByRole("region", { name: "Answer explanation" }).count()) ===
      0,
    "exam permits edits without revealing explanation",
  );
  await page.waitForFunction(
    () =>
      document
        .querySelector(".study-header")
        ?.textContent.includes("Completed"),
    null,
    { timeout: 15000 },
  );
  ok(
    (await page.getByRole("region", { name: "Answer explanation" }).count()) ===
      1,
    "timer expiry completes exam and reveals review",
  );
  ok(
    (await page.evaluate(() =>
      localStorage.getItem(
        Object.keys(localStorage).find((k) => k.startsWith("testit_quiz_")),
      ),
    )) === bank.raw,
    "practice never overwrites the imported bank",
  );
  // Isolate quota failure with a new session and retain its in-memory export.
  await page
    .getByRole("button", { name: "Back to sessions", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Create a test", exact: true })
    .first()
    .click();
  await page.getByLabel("Number of questions").fill("1");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .last()
    .click();
  await page.locator("#clinical-question").waitFor();
  const beforeFailure = await page.evaluate(() =>
    localStorage.getItem("testit_qbank_v1"),
  );
  await page.evaluate(() => {
    window.originalStorageSet = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k, v) {
      if (k === "testit_qbank_v1")
        throw new DOMException("Quota", "QuotaExceededError");
      return window.originalStorageSet.call(this, k, v);
    };
  });
  await page.keyboard.press("1");
  await page.getByRole("alert").waitFor();
  await page.getByRole("button", { name: "Suspend", exact: true }).click();
  ok(
    await page.locator("#clinical-question").isVisible(),
    "failed save cannot silently discard in-memory session",
  );
  const recoveryDownload = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Export recovery", exact: true })
    .click();
  const recoveryFile = await recoveryDownload;
  const recovery = JSON.parse(
    await fs.readFile(await recoveryFile.path(), "utf8"),
  );
  ok(
    Object.values(recovery.customData.testit_qbank_v1.attempts).some(
      (a) => Object.keys(a.answers).length > 0 && a.status === "suspended",
    ),
    "recovery export includes unsaved response",
  );
  ok(
    (await page.evaluate(() => localStorage.getItem("testit_qbank_v1"))) ===
      beforeFailure,
    "quota failure leaves stored attempts intact",
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = window.originalStorageSet;
  });
  await page.getByRole("button", { name: "Retry saving", exact: true }).click();
  ok(
    (await page.locator(".save-warning").count()) === 0,
    "retry clears save failure",
  );
  await page.getByRole("button", { name: "Suspend", exact: true }).click();
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.getByRole("heading", { name: /A clearer path/ }).waitFor();
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector("main > div")).opacity === "1",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "dashboard fits phone viewport",
  );
  if (
    await page
      .getByRole("button", { name: "Dismiss notification", exact: true })
      .count()
  )
    await page
      .getByRole("button", { name: "Dismiss notification", exact: true })
      .click();
  await page.screenshot({
    path: path.join(artifacts, "dashboard-mobile.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  ok(
    await page
      .getByRole("button", { name: "Question library", exact: true })
      .isVisible(),
    "phone navigation drawer works",
  );
  ok(
    await page.evaluate(
      () => !!document.activeElement.closest("#workspace-navigation"),
    ),
    "phone navigation receives keyboard focus",
  );
  await page.keyboard.press("Escape");
  ok(
    (await page
      .getByRole("button", { name: "Open navigation", exact: true })
      .getAttribute("aria-expanded")) === "false",
    "Escape closes phone navigation",
  );
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Question library", exact: true })
    .click();
  await page.getByRole("heading", { name: /Your question library/ }).waitFor();
  await page.waitForFunction(
    () =>
      getComputedStyle(document.querySelector("main > div")).opacity === "1",
  );
  await page.screenshot({
    path: path.join(artifacts, "library-mobile.png"),
    fullPage: true,
  });
  await page
    .getByRole("link", { name: "Skip to content", exact: true })
    .focus();
  await page
    .getByRole("link", { name: "Skip to content", exact: true })
    .click();
  ok(
    await page
      .getByRole("heading", { name: /Your question library/ })
      .isVisible(),
    "skip link keeps the current application route",
  );
  await page.getByRole("button", { name: "Import JSON", exact: true }).click();
  await page
    .getByLabel("Quiz JSON", { exact: true })
    .fill(
      '{"questions":[{"id":1,"question":"Invalid","options":{"a":"Only one"},"correct_answer":"a"}]}',
    );
  await page
    .getByRole("button", { name: "Import question bank", exact: true })
    .click();
  ok(
    await page.getByRole("alert").isVisible(),
    "invalid JSON bank shows a useful validation error",
  );
  await page
    .getByLabel("Quiz JSON", { exact: true })
    .fill(JSON.stringify(JSON.parse(bank.raw).quiz));
  await page
    .getByRole("button", { name: "Import question bank", exact: true })
    .click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  ok(
    (await page.evaluate(
      () =>
        Object.keys(localStorage).filter((k) => k.startsWith("testit_quiz_"))
          .length,
    )) === 1,
    "reimport through React reuses bank and preserves progress",
  );
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Dark appearance", exact: true })
    .click();
  ok(
    await page.evaluate(
      () => document.documentElement.dataset.theme === "dark",
    ),
    "dark appearance persists through the original theme key",
  );
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: path.join(artifacts, "library-mobile-dark.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Light appearance", exact: true })
    .click();
  await page.keyboard.press("Escape");
  await page
    .getByRole("button", { name: "Open navigation", exact: true })
    .click();
  await page
    .locator("#workspace-navigation")
    .getByRole("button", { name: "Create questions with AI", exact: true })
    .click();
  await page
    .getByRole("heading", { name: /Create questions with AI/ })
    .waitFor();
  await page
    .getByLabel("Topic or bank title", { exact: true })
    .fill("Renal reasoning specifications");
  await page.getByLabel("AI question count", { exact: true }).fill("3");
  await page
    .getByLabel("Options per question", { exact: true })
    .selectOption("4");
  await page
    .getByLabel("Learning objectives", { exact: true })
    .fill("Interpret clinical findings in renal disease");
  await page
    .getByLabel("Source material or notes", { exact: true })
    .fill("Provided lecture excerpt for the renal block.");
  await page
    .getByLabel("Additional specifications", { exact: true })
    .fill("Focus on clinical reasoning and give units.");
  await page
    .getByRole("button", { name: "Generate prompt", exact: true })
    .click();
  const generatedPrompt = await page
    .getByLabel("Generated AI prompt", { exact: true })
    .inputValue();
  ok(
    generatedPrompt.includes("exactly 3") &&
      generatedPrompt.includes("exactly 4") &&
      generatedPrompt.includes("Provided lecture excerpt") &&
      generatedPrompt.includes("option_explanations"),
    "native prompt incorporates specifications, source and all-option explanations",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy prompt", exact: true }).click();
  await page
    .getByText("Prompt copied. Paste it into your AI chat.", { exact: true })
    .waitFor();
  ok(
    (await page.evaluate(() => navigator.clipboard.readText())).replace(
      /\r\n/g,
      "\n",
    ) === generatedPrompt.replace(/\r\n/g, "\n"),
    "Copy prompt writes the complete brief to the clipboard",
  );
  await page.getByLabel("Preset name", { exact: true }).fill("Renal preset");
  await page
    .getByRole("button", { name: "Save specifications", exact: true })
    .click();
  await page.reload();
  await page
    .getByLabel("Load saved specifications", { exact: true })
    .selectOption("Renal preset");
  ok(
    (await page
      .getByLabel("Topic or bank title", { exact: true })
      .inputValue()) === "Renal reasoning specifications",
    "saved prompt specifications survive reload using existing preset storage",
  );
  const aiQuiz = JSON.parse(bank.raw).quiz;
  aiQuiz.title = "AI authoring workflow fixture";
  aiQuiz.questions = [
    {
      ...aiQuiz.questions[0],
      question:
        "A 54-year-old patient attends a district hospital after three days of worsening breathlessness. She describes a gradual decline in exercise tolerance and swelling of both ankles during the preceding month. Her history and medication list are reviewed before the examination. On examination, several relevant cardiovascular and respiratory findings are documented, followed by the initial laboratory results. Which investigation is most appropriate next?",
    },
  ];
  await page
    .getByLabel("AI response JSON", { exact: true })
    .fill(JSON.stringify(aiQuiz));
  await page
    .getByRole("button", { name: "Create review prompt", exact: true })
    .click();
  ok(
    (
      await page.getByLabel("Generated AI prompt", { exact: true }).inputValue()
    ).includes("INDEPENDENT CLINICAL REVIEW"),
    "review prompt includes the returned quiz for a separate reviewer",
  );
  await page
    .getByRole("button", { name: "Import AI questions", exact: true })
    .click();
  await page.getByText("Question bank imported.", { exact: true }).waitFor();
  ok(
    (await page.evaluate(
      () =>
        Object.keys(localStorage).filter((k) => k.startsWith("testit_quiz_"))
          .length,
    )) === 2,
    "AI response imports a new bank while preserving existing questions",
  );
  ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "AI authoring fits the phone viewport",
  );
  await page.screenshot({
    path: path.join(artifacts, "authoring-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.screenshot({
    path: path.join(artifacts, "authoring-desktop.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Build a practice session", exact: true })
    .click();
  await page
    .getByRole("heading", { name: /Make this session yours/ })
    .waitFor();
  ok(
    await page
      .getByText("AI authoring workflow fixture", { exact: true })
      .isVisible(),
    "imported AI bank is immediately available in the test builder",
  );
  await page.getByLabel("Clinical foundations", { exact: false }).uncheck();
  await page.getByLabel("Number of questions").fill("1");
  await page
    .getByRole("button", { name: "Start session", exact: true })
    .last()
    .click();
  await page.locator("#clinical-question").waitFor();
  await page.setViewportSize({ width: 1920, height: 1080 });
  ok(
    (await page.locator("#clinical-question p").count()) >= 2,
    "long imported vignette is split into readable paragraphs",
  );
  ok(
    (await page.locator("#clinical-question").textContent()) ===
      aiQuiz.questions[0].question,
    "paragraph layout preserves every original character",
  );
  const widths = await page.evaluate(() => {
    const q = document.querySelector(".question-pane"),
      stem = document.querySelector(".clinical-stem"),
      style = getComputedStyle(q);
    return {
      stem: stem.getBoundingClientRect().width,
      available:
        q.clientWidth -
        parseFloat(style.paddingLeft) -
        parseFloat(style.paddingRight),
    };
  });
  ok(
    widths.stem >= widths.available * 0.98,
    "question text fills available desktop width without the old cap",
  );
  await page.evaluate(() => {
    const el = document.querySelector("#clinical-question"),
      walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node;
    const nodes = [];
    while ((node = walker.nextNode())) nodes.push(node);
    const range = document.createRange();
    range.setStart(nodes[0], 10);
    range.setEnd(nodes.at(-1), 20);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(range);
    window.expectedHighlight = range.toString();
  });
  await page
    .getByRole("button", {
      name: "Highlight selected question text",
      exact: true,
    })
    .click();
  ok(
    (await page.locator("#clinical-question mark").count()) > 1,
    "highlight can span paragraph boundaries",
  );
  const highlighted = await page.evaluate(() => {
    const store = JSON.parse(localStorage.getItem("testit_qbank_v1"));
    const a = Object.values(store.attempts).find((a) => a.status === "active");
    const i = a.items[a.index];
    const [start, end] = a.highlights[i.key][0];
    return i.question.question.slice(start, end) === window.expectedHighlight;
  });
  ok(highlighted, "paragraph-spanning highlights retain exact source offsets");
  await page.screenshot({
    path: path.join(artifacts, "question-wide-paragraphs.png"),
    fullPage: true,
  });
  await page.keyboard.press("1");
  await page
    .getByRole("button", { name: "Submit answer", exact: true })
    .click();
  await page.getByRole("region", { name: "Answer explanation" }).waitFor();
  ok(
    await page.getByRole("region", { name: "Answer explanation" }).isVisible(),
    "explanation still occupies the right pane after submission",
  );
  await page.getByRole("button", { name: "Suspend", exact: true }).click();
  await page
    .getByRole("button", { name: "Resume session", exact: true })
    .first()
    .click();
  await page.locator("#clinical-question").waitFor();
  ok(
    (await page.locator("#clinical-question mark").count()) > 1,
    "paragraph-spanning highlights survive suspend and resume",
  );
  await page.getByRole("button", { name: "Suspend", exact: true }).click();
  const original = await context.newPage();
  await original.goto(base + "/legacy/index.html?view=settings");
  await original.locator("#view-settings").waitFor({ state: "visible" });
  ok(
    await original.locator("#view-settings").isVisible(),
    "preserved original settings route loads",
  );
  ok(
    await original.evaluate(
      () =>
        typeof window.googleAuth?.signIn === "function" &&
        typeof window.syncManager?.syncNow === "function",
    ),
    "original Google sign-in and sync remain available",
  );
  const originalAnki = await original.evaluate(
    () => typeof buildAnkiText === "function",
  );
  ok(
    originalAnki,
    "original revision and Anki implementation remains available",
  );
  ok(
    errors.length === 0,
    "no uncaught React browser errors: " + errors.join("; "),
  );
  console.log(`\n${checks} browser checks passed. Screenshots: ${artifacts}`);
} catch (error) {
  if (failurePage) {
    await failurePage
      .screenshot({ path: path.join(artifacts, "failure.png"), fullPage: true })
      .catch(() => {});
    console.log((await failurePage.locator("body").innerText()).slice(0, 4500));
  }
  throw error;
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
