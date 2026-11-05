import { clone, merge, validateQuiz, validateStore } from "../domain/engine";
import type { Attempt, Backup, Bank, Store } from "../domain/types";
export const STORE_KEY = "testit_qbank_v1";
const customKeys = [
  "testit_revision_v1",
  "testit_anki_deck",
  "testit_prompt_presets",
  STORE_KEY,
];
export const emptyStore = (): Store => ({ version: 1, attempts: {} });
export function readStore(): Store {
  const raw = localStorage.getItem(STORE_KEY);
  if (!raw) return emptyStore();
  const s: unknown = JSON.parse(raw);
  validateStore(s);
  return s;
}
export function readBanks(): { banks: Bank[]; warnings: string[] } {
  const banks: Bank[] = [],
    warnings: string[] = [];
  for (const key of Object.keys(localStorage).filter((k) =>
    k.startsWith("testit_quiz_"),
  )) {
    try {
      const data = JSON.parse(localStorage.getItem(key)!);
      validateQuiz(data.quiz);
      if (data.flags !== undefined && !Array.isArray(data.flags))
        throw Error("Invalid saved flags");
      if (
        data.answers !== undefined &&
        (!data.answers ||
          typeof data.answers !== "object" ||
          Array.isArray(data.answers))
      )
        throw Error("Invalid saved answers");
      if (!data.qbankAttempt) banks.push({ key, data });
    } catch {
      warnings.push(key);
    }
  }
  return {
    banks: banks.sort((a, b) => (b.data.savedAt || 0) - (a.data.savedAt || 0)),
    warnings,
  };
}
export function touch() {
  try {
    localStorage.setItem("testit_data_modified", String(Date.now()));
  } catch {
    /* Study data has already been committed. */
  }
}
export function saveAttempt(a: Attempt): Store {
  const current = readStore(),
    candidate = clone(a);
  candidate.parentRevision = a.revision;
  candidate.revision = crypto.randomUUID();
  // Preserve revision ordering even with rapid events or a backwards wall clock.
  candidate.savedAt = Math.max(
    Date.now(),
    a.savedAt + 1,
    (current.attempts[a.id]?.savedAt || 0) + 1,
  );
  const result = merge(current, {
    version: 1,
    attempts: { [candidate.id]: candidate },
  });
  localStorage.setItem(STORE_KEY, JSON.stringify(result));
  Object.assign(a, candidate);
  touch();
  return result;
}
export function importQuiz(text: string): string {
  const clean = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const quiz = JSON.parse(clean);
  validateQuiz(quiz);
  for (const b of readBanks().banks)
    if (JSON.stringify(b.data.quiz) === JSON.stringify(quiz)) return b.key;
  const key = "testit_quiz_bank_" + crypto.randomUUID();
  localStorage.setItem(
    key,
    JSON.stringify({
      quiz,
      answers: {},
      flags: [],
      savedAt: Date.now(),
      _slot: key,
    }),
  );
  touch();
  return key;
}
export function buildBackup(memory?: Attempt | null): Backup {
  const studyProgress: Backup["studyProgress"] = {},
    customData: Record<string, unknown> = {},
    recoveryRaw: Record<string, string> = {};
  for (const key of Object.keys(localStorage))
    if (key.startsWith("testit_quiz_") || customKeys.includes(key)) {
      const raw = localStorage.getItem(key)!;
      try {
        const value = JSON.parse(raw);
        if (key.startsWith("testit_quiz_")) studyProgress[key] = value;
        else customData[key] = value;
      } catch {
        recoveryRaw[key] = raw;
      }
    }
  if (memory) {
    let s: Store;
    try {
      s = readStore();
    } catch {
      s = emptyStore();
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) recoveryRaw[STORE_KEY] = raw;
    }
    s.attempts[memory.id] = clone(memory);
    customData[STORE_KEY] = s;
  }
  return {
    version: 1,
    lastModified: Number(localStorage.getItem("testit_data_modified")) || 0,
    studyProgress,
    customData,
    settings: { theme: localStorage.getItem("testit_theme") || "light" },
    statistics: {},
    bookmarks: {},
    recoveryRaw,
  };
}
export function parseBackup(text: string): Backup {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    value = JSON.parse(
      new TextDecoder().decode(
        Uint8Array.from(atob(text.trim()), (c) => c.charCodeAt(0)),
      ),
    );
  }
  const b = value as Backup;
  if (
    !b ||
    b.version !== 1 ||
    !b.studyProgress ||
    typeof b.studyProgress !== "object" ||
    Array.isArray(b.studyProgress) ||
    !b.customData ||
    typeof b.customData !== "object" ||
    Array.isArray(b.customData)
  )
    throw Error("Unsupported backup. Expected a TESTIT version 1 backup.");
  for (const [key, data] of Object.entries(b.studyProgress)) {
    if (!key.startsWith("testit_quiz_") || !data)
      throw Error("Invalid quiz backup key.");
    validateQuiz(data.quiz);
    if (
      data.answers !== undefined &&
      (!data.answers ||
        typeof data.answers !== "object" ||
        Array.isArray(data.answers))
    )
      throw Error("Invalid saved answers.");
    if (data.flags !== undefined && !Array.isArray(data.flags))
      throw Error("Invalid flags.");
  }
  for (const [key, data] of Object.entries(b.customData)) {
    if (!customKeys.includes(key))
      throw Error("Unsupported backup key: " + key);
    if (key === STORE_KEY) validateStore(data);
  }
  if (b.settings?.theme && !["light", "dark"].includes(b.settings.theme))
    throw Error("Invalid backup theme.");
  return b;
}
export function restoreBackup(b: Backup) {
  // Validate the whole envelope before performing any writes.
  parseBackup(JSON.stringify(b));
  const writes = new Map<string, string>();
  for (const [k, v] of Object.entries({ ...b.studyProgress, ...b.customData }))
    writes.set(k, JSON.stringify(v));
  if (b.settings?.theme) writes.set("testit_theme", b.settings.theme);
  const before = new Map(
    [...writes.keys()].map((k) => [k, localStorage.getItem(k)]),
  );
  localStorage.setItem("testit_prev_backup", JSON.stringify(buildBackup()));
  try {
    for (const [k, v] of writes) localStorage.setItem(k, v);
  } catch {
    let rollbackFailed = false;
    for (const [k, v] of before)
      try {
        if (v === null) localStorage.removeItem(k);
        else localStorage.setItem(k, v);
      } catch {
        rollbackFailed = true;
      }
    throw Error(
      rollbackFailed
        ? "Restore failed; rollback was incomplete. Export the retained recovery backup."
        : "Restore failed. Previous values were restored; recovery backup retained.",
    );
  }
  touch();
}
export function download(
  name: string,
  content: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
