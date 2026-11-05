import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
const root = fileURLToPath(new URL("../../", import.meta.url)),
  dist = fileURLToPath(new URL("../dist/", import.meta.url));
const baseline = "55bf47d13781f3e5a864e4df3a44d667cc068665";
const oldIndex = execFileSync("git", ["show", baseline + ":index.html"], {
    cwd: root,
  }),
  oldWorker = execFileSync("git", ["show", baseline + ":sw.js"], { cwd: root });
let stage = "old",
  checks = 0,
  browser;
const ok = (value, label) => {
  assert.ok(value, label);
  checks++;
  console.log("PASS " + label);
};
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/testit/")) {
      res.writeHead(404);
      return res.end();
    }
    let name =
      decodeURIComponent(url.pathname.slice("/testit/".length)) || "index.html";
    const base = stage === "new" ? dist : root;
    const target = path.resolve(base, name);
    if (!target.startsWith(path.resolve(base) + path.sep)) {
      res.writeHead(403);
      return res.end();
    }
    const bytes =
      stage === "old" && name === "index.html"
        ? oldIndex
        : stage === "old" && name === "sw.js"
          ? oldWorker
          : await readFile(target);
    res.setHeader(
      "Content-Type",
      {
        ".html": "text/html",
        ".js": "application/javascript",
        ".css": "text/css",
        ".json": "application/json",
        ".woff2": "font/woff2",
        ".woff": "font/woff",
        ".png": "image/png",
      }[path.extname(name)] || "application/octet-stream",
    );
    res.setHeader("Cache-Control", "no-cache");
    res.end(bytes);
  } catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const base = "http://127.0.0.1:" + server.address().port + "/testit/";
try {
  browser = await chromium.launch({
    executablePath:
      process.env.TESTIT_BROWSER ||
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  await context.route(
    /https:\/\/(fonts\.googleapis|fonts\.gstatic|accounts\.google|www\.googleapis)\.com\//,
    (r) => r.abort(),
  );
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  ok(
    await page
      .locator("body")
      .innerText()
      .then((t) => t.includes("TEST")),
    "existing production application and worker installed at project subpath",
  );
  const before = await page.evaluate(() => {
    const quiz = {
      title: "Cutover fixture",
      questions: [
        {
          id: 1,
          question: "Which statement correctly describes cardiac output?",
          options: {
            a: "Heart rate multiplied by stroke volume",
            b: "Heart rate divided by stroke volume",
          },
          correct_answer: "a",
          explanation:
            "Cardiac output depends on beats per minute and volume per beat.",
          concept_card: {
            question: "How is cardiac output calculated?",
            answer: "Heart rate multiplied by stroke volume.",
            explanation: "Rate and volume per beat determine flow.",
          },
        },
      ],
    };
    const slot = "testit_quiz_cutover";
    const record = { quiz, answers: { 1: "b" }, flags: [1], savedAt: 100 };
    localStorage.setItem(slot, JSON.stringify(record));
    const q = quiz.questions[0],
      key = JSON.stringify([
        slot,
        "1",
        q.concept_card.question,
        q.concept_card.answer,
        q.concept_card.explanation,
      ]);
    const schedule = JSON.stringify({
      [key]: {
        due: 9999999999999,
        interval: 8,
        reviews: 3,
        lastReviewed: 100,
        rating: 2,
      },
    });
    localStorage.setItem("testit_revision_v1", schedule);
    return { bank: localStorage.getItem(slot), schedule };
  });
  stage = "new";
  await page.goto(base);
  await page.getByRole("heading", { name: /A clearer path/ }).waitFor();
  ok(
    (await page
      .getByRole("button", { name: "Create questions with AI", exact: true })
      .count()) > 0,
    "new React root and relative assets load under /testit/",
  );
  await page
    .getByText("A TESTIT update is ready. Save and reload when you’re ready.", {
      exact: true,
    })
    .waitFor();
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
  await page.keyboard.press("1");
  ok(
    (await page.getByRole("radio", { checked: true }).count()) === 1,
    "pending service-worker update does not interrupt active answering",
  );
  await Promise.all([
    page.waitForNavigation({ waitUntil: "load" }),
    page.getByRole("button", { name: "Save & reload", exact: true }).click(),
  ]);
  await page
    .getByRole("heading", { name: /Make this session yours/ })
    .waitFor();
  const after = await page.evaluate(() => ({
    bank: localStorage.getItem("testit_quiz_cutover"),
    schedule: localStorage.getItem("testit_revision_v1"),
    attempts: Object.values(
      JSON.parse(localStorage.getItem("testit_qbank_v1")).attempts,
    ),
  }));
  ok(
    after.bank === before.bank && after.schedule === before.schedule,
    "cutover preserves original bank, legacy answers, flags and revision schedule byte-for-byte",
  );
  ok(
    after.attempts.length === 1 &&
      after.attempts[0].status === "suspended" &&
      Object.keys(after.attempts[0].answers).length === 1,
    "safe update saves and suspends the active session before reload",
  );
  ok(
    await page.evaluate(async () =>
      (await caches.keys()).some((k) => k.startsWith("testit2-shell-")),
    ),
    "new offline shell is installed without deleting legacy data",
  );
  await context.setOffline(true);
  await page.reload();
  await page
    .getByRole("heading", { name: /Make this session yours/ })
    .waitFor();
  ok(
    await page
      .locator("body")
      .innerText()
      .then((t) => t.includes("Cutover fixture")),
    "React shell and bank work after an offline reload",
  );
  await page
    .getByRole("button", { name: "Concept revision", exact: true })
    .click();
  await page.getByRole("heading", { name: /Return to the concept/ }).waitFor();
  ok(
    (await page.getByText("1 concept cards", { exact: false }).count()) > 0,
    "lazy revision route works offline after cutover",
  );
  await context.setOffline(false);
  ok(
    (await context.request.get(base + "auth.html")).status() === 200,
    "original OAuth callback path remains available",
  );
  ok(
    (await context.request.get(base + "legacy/index.html")).status() === 200,
    "preserved original interface is available under the same origin",
  );
  await page.goto(base + "?view=revision");
  await page.getByRole("heading", { name: /Return to the concept/ }).waitFor();
  ok(
    true,
    "existing installed-app revision shortcuts still open the correct screen",
  );
  ok(
    errors.length === 0,
    "no browser exceptions during production cutover: " + errors.join("; "),
  );
  console.log(`${checks} production cutover checks passed.`);
} finally {
  await browser?.close();
  await new Promise((r) => server.close(r));
}
