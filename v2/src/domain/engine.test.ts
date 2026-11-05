import { describe, expect, it, beforeEach, vi } from "vitest";
import {
  clone,
  complete,
  createAttempt,
  eligible,
  identity,
  merge,
  score,
  tick,
  validateQuiz,
  validateStore,
} from "./engine";
import { ankiText, cards, nextSchedule, revisionKey } from "./revision";
import { sample } from "./sample";
import type { Bank, TestConfig } from "./types";
import {
  buildBackup,
  importQuiz,
  parseBackup,
  readBanks,
  readStore,
  restoreBackup,
  saveAttempt,
} from "../repositories/storage";
const banks: Bank[] = [
  {
    key: "testit_quiz_fixture",
    data: { quiz: sample, answers: { 2: "b" }, flags: [3] },
  },
];
const config: TestConfig = {
  banks: [banks[0].key],
  subjects: [],
  systems: [],
  pool: "all",
  count: 3,
  mode: "tutor",
  timed: false,
  minutes: 3,
  name: "Clinical fixture",
};
const make = () => createAttempt(eligible(banks, {}, config), config, 1000);
describe("study model compatibility", () => {
  it("preserves source content and stable bank-scoped answer identities", () => {
    const before = clone(banks),
      a = make();
    validateStore({ version: 1, attempts: { [a.id]: a } });
    expect(banks).toEqual(before);
    expect(a.items).toHaveLength(3);
    expect(identity("one", 1)).not.toBe(identity("two", 1));
    expect(clone(a).items).toEqual(a.items);
  });
  it("uses finalized responses for pools and preserves legacy answers", () => {
    expect(
      eligible(banks, {}, { ...config, pool: "incorrect" }).map(
        (i) => i.question.id,
      ),
    ).toEqual([2]);
    const a = createAttempt(
        eligible(banks, {}, config),
        { ...config, count: 4 },
        1000,
      ),
      i = a.items.find((i) => i.question.id === 1)!;
    a.answers[i.key] = "b";
    expect(
      eligible(banks, { [a.id]: a }, { ...config, pool: "incorrect" }),
    ).toHaveLength(1);
    a.submitted.push(i.key);
    expect(
      eligible(banks, { [a.id]: a }, { ...config, pool: "incorrect" }),
    ).toHaveLength(2);
  });
  it("counts timestamp time across throttling, pauses when suspended, finalizes once", () => {
    const a = make();
    a.timed = true;
    a.durationMs = 60000;
    tick(a, 11000);
    expect(a.elapsedMs).toBe(10000);
    a.status = "suspended";
    a.runningSince = null;
    tick(a, 51000);
    expect(a.elapsedMs).toBe(10000);
    a.status = "active";
    a.runningSince = 51000;
    tick(a, 102000);
    expect(a.status).toBe("completed");
    const elapsed = a.elapsedMs;
    tick(a, 200000);
    expect(a.elapsedMs).toBe(elapsed);
  });
  it("includes omissions and preserves divergent revisions", () => {
    const a = make();
    a.answers[a.items[0].key] = a.items[0].question.correct_answer;
    complete(a);
    expect(score(a)).toMatchObject({
      correct: 1,
      answered: 1,
      incorrect: 0,
      omitted: 2,
      total: 3,
      percent: 33,
    });
    const b = clone(a);
    b.revision = "branch";
    b.savedAt = 2000;
    const merged = merge(
      { version: 1, attempts: { [a.id]: a } },
      { version: 1, attempts: { [b.id]: b } },
    );
    expect(Object.keys(merged.attempts)).toHaveLength(2);
    expect(
      Object.keys(
        merge(merged, { version: 1, attempts: { [b.id]: b } }).attempts,
      ),
    ).toHaveLength(2);
  });
  it("rejects corrupt structures without claiming clinical verification", () => {
    expect(() =>
      validateQuiz({
        questions: [
          {
            id: 1,
            question: "x",
            options: { a: "Yes", b: "No" },
            correct_answer: "z",
          },
        ],
      }),
    ).toThrow();
    const a = make();
    a.items[0].order = ["a", "a"];
    expect(() =>
      validateStore({ version: 1, attempts: { [a.id]: a } }),
    ).toThrow();
    expect(() => validateStore({ version: 2, attempts: {} })).toThrow();
  });
  it("retains exact revision keys, interval rules and safe Anki format", () => {
    const q = sample.questions[0],
      key = revisionKey(banks[0].key, q);
    expect(key).toBe(
      JSON.stringify([
        banks[0].key,
        String(q.id),
        q.concept_card!.question,
        q.concept_card!.answer,
        q.concept_card!.explanation,
      ]),
    );
    expect(nextSchedule(2, undefined, 0).due).toBe(2 * 86400000);
    expect(nextSchedule(0, undefined, 0).due).toBe(600000);
    const entries = cards(banks, {}, {});
    expect(ankiText(entries)).toContain("#notetype:Basic");
    expect(ankiText(entries, true)).toContain("#tags column:4");
    expect(ankiText(entries)).toContain(q.concept_card!.question);
  });
});
class MemoryStorage {
  [key: string]: unknown;
  getItem(k: string) {
    return Object.hasOwn(this, k) ? String(this[k]) : null;
  }
  setItem(k: string, v: string) {
    Object.defineProperty(this, k, {
      value: v,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  }
  removeItem(k: string) {
    delete this[k];
  }
}
describe("storage and recovery", () => {
  it("keeps successive responses when saves share the same wall-clock millisecond", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(1000);
    try {
      const a = make();
      saveAttempt(a);
      const i = a.items[0];
      a.answers[i.key] = i.order[0];
      saveAttempt(a);
      a.answers[i.key] = i.order[1];
      saveAttempt(a);
      expect(readStore().attempts[a.id].answers[i.key]).toBe(i.order[1]);
      expect(Object.keys(readStore().attempts)).toHaveLength(1);
      expect(a.savedAt).toBeGreaterThan(1000);
    } finally {
      clock.mockRestore();
    }
  });
  beforeEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      value: new MemoryStorage(),
      configurable: true,
    });
  });
  it("imports identical banks without overwriting progress, backs up full state", () => {
    const key = importQuiz(JSON.stringify(sample));
    const b = JSON.parse(localStorage.getItem(key)!);
    b.answers = { "1": "b" };
    localStorage.setItem(key, JSON.stringify(b));
    expect(importQuiz(JSON.stringify(sample))).toBe(key);
    expect(readBanks().banks).toHaveLength(1);
    expect(readBanks().banks[0].data.answers).toEqual({ "1": "b" });
    const a = make();
    saveAttempt(a);
    expect(Object.values(readStore().attempts)).toHaveLength(1);
    const backup = buildBackup();
    expect(parseBackup(JSON.stringify(backup))).toEqual(backup);
    restoreBackup(backup);
    expect(localStorage.getItem("testit_prev_backup")).toBeTruthy();
  });
  it("rejects credential injection before any mutation", () => {
    localStorage.setItem("testit_theme", "dark");
    const b = buildBackup();
    b.customData.testit_gtoken = { token: "bad" };
    expect(() => restoreBackup(b)).toThrow("Unsupported backup key");
    expect(localStorage.getItem("testit_theme")).toBe("dark");
    expect(localStorage.getItem("testit_gtoken")).toBeNull();
    expect(localStorage.getItem("testit_prev_backup")).toBeNull();
  });
  it("preserves malformed records and unsaved attempts in recovery exports", () => {
    localStorage.setItem("testit_quiz_broken", "not json");
    const a = make();
    const b = buildBackup(a);
    expect(b.recoveryRaw?.testit_quiz_broken).toBe("not json");
    expect(
      (b.customData.testit_qbank_v1 as { attempts: object }).attempts,
    ).toHaveProperty(a.id);
  });
  it("rolls back partial restore on storage failure", () => {
    const key = importQuiz(JSON.stringify(sample));
    localStorage.setItem("testit_theme", "dark");
    const b = buildBackup();
    b.studyProgress[key].quiz.title = "Changed";
    b.settings.theme = "light";
    const real = localStorage.setItem.bind(localStorage);
    let fail = true;
    localStorage.setItem = (k, v) => {
      if (k === "testit_theme" && fail) {
        fail = false;
        throw Error("quota");
      }
      real(k, v);
    };
    expect(() => restoreBackup(b)).toThrow("Previous values were restored");
    expect(JSON.parse(localStorage.getItem(key)!).quiz.title).toBe(
      sample.title,
    );
    expect(localStorage.getItem("testit_theme")).toBe("dark");
  });
});
