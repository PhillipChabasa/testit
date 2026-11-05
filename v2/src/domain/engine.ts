import type { Attempt, Bank, Item, Question, Store, TestConfig } from "./types";
export const uid = () => crypto.randomUUID();
export const clone = <T>(value: T): T => structuredClone(value);
export const identity = (slot: string, id: string | number) =>
  JSON.stringify([slot, String(id)]);
export const list = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === "string" && !!v.trim())
    : typeof value === "string" && value.trim()
      ? [value.trim()]
      : ["Uncategorized"];
export function validateQuiz(
  value: unknown,
): asserts value is Bank["data"]["quiz"] {
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as { questions?: unknown }).questions) ||
    !(value as { questions: unknown[] }).questions.length
  )
    throw Error("A quiz needs a non-empty questions array.");
  if (
    (value as { title?: unknown }).title !== undefined &&
    typeof (value as { title?: unknown }).title !== "string"
  )
    throw Error("The quiz title must be text.");
  const ids = new Set<string>();
  for (const q of (value as { questions: Question[] }).questions) {
    if (
      !q ||
      !["string", "number"].includes(typeof q.id) ||
      typeof q.question !== "string" ||
      !q.question.trim() ||
      ids.has(String(q.id))
    )
      throw Error("Each question needs a unique ID and question text.");
    ids.add(String(q.id));
    if (
      !q.options ||
      typeof q.options !== "object" ||
      Array.isArray(q.options) ||
      Object.keys(q.options).length < 2 ||
      Object.values(q.options).some(
        (v) => typeof v !== "string" || !v.trim(),
      ) ||
      typeof q.correct_answer !== "string" ||
      !Object.hasOwn(q.options, q.correct_answer)
    )
      throw Error(
        `Question ${q.id}: provide at least two options and a valid correct_answer.`,
      );
    if (q.explanation !== undefined && typeof q.explanation !== "string")
      throw Error(`Question ${q.id}: explanation must be text.`);
    if (
      q.option_explanations !== undefined &&
      (!q.option_explanations ||
        typeof q.option_explanations !== "object" ||
        Object.entries(q.option_explanations).some(
          ([k, v]) => !Object.hasOwn(q.options, k) || typeof v !== "string",
        ))
    )
      throw Error(`Question ${q.id}: invalid option explanations.`);
    if (
      q.concept_card &&
      !["question", "answer", "explanation"].every(
        (k) =>
          typeof q.concept_card?.[k as keyof typeof q.concept_card] ===
            "string" && q.concept_card[k as keyof typeof q.concept_card].trim(),
      )
    )
      throw Error(
        `Question ${q.id}: the concept card needs question, answer and explanation.`,
      );
  }
}
export function validateStore(value: unknown): asserts value is Store {
  const s = value as Store;
  if (
    !s ||
    s.version !== 1 ||
    !s.attempts ||
    typeof s.attempts !== "object" ||
    Array.isArray(s.attempts)
  )
    throw Error(
      "Unsupported question-bank store. Export your data before continuing.",
    );
  for (const [id, a] of Object.entries(s.attempts)) {
    if (
      !a ||
      a.id !== id ||
      !/^[a-zA-Z0-9_~\-]+$/.test(id) ||
      ["__proto__", "prototype", "constructor"].includes(id) ||
      a.version !== 1 ||
      !["active", "suspended", "completed"].includes(a.status) ||
      !["tutor", "exam"].includes(a.mode) ||
      !Array.isArray(a.items) ||
      !a.items.length ||
      !Number.isInteger(a.index) ||
      a.index < 0 ||
      a.index >= a.items.length ||
      !Number.isFinite(a.elapsedMs) ||
      a.elapsedMs < 0 ||
      !Number.isFinite(a.durationMs) ||
      a.durationMs < 0 ||
      !a.answers ||
      typeof a.answers !== "object" ||
      Array.isArray(a.answers) ||
      !Array.isArray(a.flags) ||
      !Array.isArray(a.submitted) ||
      !a.highlights ||
      typeof a.highlights !== "object" ||
      !a.questionMs ||
      typeof a.questionMs !== "object" ||
      typeof a.revision !== "string" ||
      typeof a.timed !== "boolean" ||
      typeof a.name !== "string" ||
      !Number.isFinite(a.savedAt) ||
      !Number.isFinite(a.createdAt) ||
      !(a.runningSince === null || Number.isFinite(a.runningSince))
    )
      throw Error("Invalid saved test. Original data has been retained.");
    const keys = new Set<string>();
    for (const i of a.items) {
      validateQuiz({ questions: [i.question] });
      if (
        typeof i.key !== "string" ||
        typeof i.bank !== "string" ||
        keys.has(i.key) ||
        !Array.isArray(i.order) ||
        i.order.length !== Object.keys(i.question.options).length ||
        new Set(i.order).size !== i.order.length ||
        !i.order.every((k) => Object.hasOwn(i.question.options, k))
      )
        throw Error("Invalid saved question order.");
      keys.add(i.key);
      if (
        Object.hasOwn(a.answers, i.key) &&
        !Object.hasOwn(i.question.options, a.answers[i.key])
      )
        throw Error("Invalid saved answer.");
      if (
        a.highlights[i.key] &&
        !a.highlights[i.key].every(
          (r) =>
            Array.isArray(r) &&
            r.length === 2 &&
            Number.isInteger(r[0]) &&
            Number.isInteger(r[1]) &&
            r[0] >= 0 &&
            r[1] > r[0] &&
            r[1] <= i.question.question.length,
        )
      )
        throw Error("Invalid highlights.");
      if (
        a.eliminated?.[i.key] &&
        (!Array.isArray(a.eliminated[i.key]) ||
          !a.eliminated[i.key].every((k) =>
            Object.hasOwn(i.question.options, k),
          ))
      )
        throw Error("Invalid eliminated options.");
    }
    if (
      !Object.keys(a.answers).every((k) => keys.has(k)) ||
      !a.flags.every((k) => keys.has(k)) ||
      !a.submitted.every((k) => keys.has(k) && Object.hasOwn(a.answers, k))
    )
      throw Error("Invalid saved question references.");
  }
}
export function merge(left: Store, right: Store): Store {
  validateStore(left);
  validateStore(right);
  const out = clone(left);
  for (const [id, b] of Object.entries(right.attempts)) {
    const a = out.attempts[id];
    if (!a) {
      out.attempts[id] = clone(b);
      continue;
    }
    if (a.revision === b.revision) continue;
    const newer =
        b.parentRevision === a.revision
          ? b
          : a.parentRevision === b.revision
            ? a
            : a.savedAt >= b.savedAt
              ? a
              : b,
      older = newer === a ? b : a;
    out.attempts[id] = clone(newer);
    if (newer.parentRevision !== older.revision) {
      const recovered = id + "~" + older.revision;
      if (!out.attempts[recovered])
        out.attempts[recovered] = {
          ...clone(older),
          id: recovered,
          name: older.name + " (recovered conflict)",
          status: older.status === "completed" ? "completed" : "suspended",
          runningSince: null,
        };
    }
  }
  return out;
}
export function latest(attempts: Store["attempts"], key: string) {
  return Object.values(attempts)
    .filter(
      (a) =>
        a.items.some((i) => i.key === key) &&
        (a.status === "completed" || a.submitted.includes(key)),
    )
    .sort(
      (a, b) =>
        (b.responseAt?.[key] || b.completedAt || b.savedAt) -
        (a.responseAt?.[key] || a.completedAt || a.savedAt),
    )[0];
}
export function eligible(
  banks: Bank[],
  attempts: Store["attempts"],
  config: TestConfig,
): Item[] {
  return banks
    .filter((b) => config.banks.includes(b.key))
    .flatMap((b) =>
      b.data.quiz.questions.flatMap((q) => {
        const key = identity(b.key, q.id),
          a = latest(attempts, key),
          answer = a ? a.answers[key] : b.data.answers?.[String(q.id)];
        const flagged =
          !!b.data.flags?.some((id) => String(id) === String(q.id)) ||
          Object.values(attempts).some((t) => t.flags.includes(key));
        if (
          config.subjects.length &&
          !list(q.subject ?? b.data.quiz.subject).some((s) =>
            config.subjects.includes(s),
          )
        )
          return [];
        if (
          config.systems.length &&
          !list(q.system ?? b.data.quiz.system).some((s) =>
            config.systems.includes(s),
          )
        )
          return [];
        if (config.pool === "unused" && (answer !== undefined || a)) return [];
        if (
          config.pool === "incorrect" &&
          (answer === undefined || answer === q.correct_answer)
        )
          return [];
        if (config.pool === "flagged" && !flagged) return [];
        return [
          {
            key,
            bank: b.key,
            bankTitle: b.data.quiz.title || "Untitled bank",
            question: clone({
              ...q,
              subject: q.subject ?? b.data.quiz.subject,
              system: q.system ?? b.data.quiz.system,
            }),
            order: Object.keys(q.options),
          },
        ];
      }),
    );
}
export function shuffle<T>(values: T[]): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
export function createAttempt(
  items: Item[],
  c: TestConfig,
  now = Date.now(),
): Attempt {
  if (!Number.isInteger(c.count) || c.count < 1 || c.count > items.length)
    throw Error("Choose a question count within the available pool.");
  if (
    !["tutor", "exam"].includes(c.mode) ||
    (c.timed && (!Number.isFinite(c.minutes) || c.minutes <= 0))
  )
    throw Error("Choose a valid mode and duration.");
  return {
    version: 1,
    id: uid(),
    revision: uid(),
    parentRevision: null,
    name: c.name.trim() || "Clinical practice",
    mode: c.mode,
    timed: c.timed,
    durationMs: c.timed ? c.minutes * 60000 : 0,
    elapsedMs: 0,
    runningSince: now,
    status: "active",
    items: shuffle(items)
      .slice(0, c.count)
      .map((i) => ({ ...clone(i), order: shuffle(i.order) })),
    index: 0,
    answers: {},
    flags: [],
    submitted: [],
    responseAt: {},
    highlights: {},
    eliminated: {},
    questionMs: {},
    createdAt: now,
    savedAt: now,
  };
}
export function complete(a: Attempt, now = Date.now()) {
  a.status = "completed";
  a.runningSince = null;
  a.completedAt = now;
  a.responseAt ||= {};
  for (const i of a.items) a.responseAt[i.key] ||= now;
  a.submitted = a.items
    .filter((i) => Object.hasOwn(a.answers, i.key))
    .map((i) => i.key);
}
export function tick(a: Attempt, now = Date.now()) {
  if (a.status !== "active" || a.runningSince === null) return;
  const delta = Math.max(0, now - a.runningSince);
  a.elapsedMs += delta;
  const k = a.items[a.index].key;
  a.questionMs[k] = (a.questionMs[k] || 0) + delta;
  a.runningSince = now;
  if (a.timed && a.elapsedMs >= a.durationMs) complete(a, now);
}
export function score(a: Attempt) {
  const correct = a.items.filter(
      (i) => a.answers[i.key] === i.question.correct_answer,
    ).length,
    answered = Object.keys(a.answers).length;
  return {
    correct,
    answered,
    incorrect: answered - correct,
    omitted: a.items.length - answered,
    total: a.items.length,
    percent: Math.round((correct / a.items.length) * 100),
  };
}
export const time = (ms: number) => {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)
    .toString()
    .padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;
};
