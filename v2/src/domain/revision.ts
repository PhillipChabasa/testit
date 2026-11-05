import { identity, latest } from "./engine";
import type { Bank, CardEntry, Schedule, Store } from "./types";
export const revisionKey = (
  slot: string,
  q: Bank["data"]["quiz"]["questions"][number],
) =>
  JSON.stringify([
    slot,
    String(q.id),
    q.concept_card!.question,
    q.concept_card!.answer,
    q.concept_card!.explanation,
  ]);
export function cards(
  banks: Bank[],
  attempts: Store["attempts"],
  schedules: Record<string, Schedule>,
): CardEntry[] {
  return banks.flatMap((b) =>
    b.data.quiz.questions
      .filter((q) => q.concept_card)
      .map((q) => {
        const key = revisionKey(b.key, q),
          a = latest(attempts, identity(b.key, q.id)),
          answer = a
            ? a.answers[identity(b.key, q.id)]
            : b.data.answers?.[String(q.id)];
        return {
          key,
          slot: b.key,
          id: q.id,
          title: b.data.quiz.title || "Untitled bank",
          card: q.concept_card!,
          tags: Array.isArray(q.tags)
            ? q.tags.filter((t) => typeof t === "string")
            : [],
          schedule: schedules[key],
          wrong: answer !== undefined && answer !== q.correct_answer,
          flagged:
            !!b.data.flags?.some((id) => String(id) === String(q.id)) ||
            Object.values(attempts).some((t) =>
              t.flags.includes(identity(b.key, q.id)),
            ),
        };
      }),
  );
}
export function nextSchedule(
  rating: number,
  old?: Schedule,
  now = Date.now(),
): Schedule {
  const interval =
    rating === 0
      ? 0
      : rating === 1
        ? 1
        : rating === 2
          ? Math.max(2, (old?.interval || 1) * 2)
          : Math.max(4, (old?.interval || 1) * 3);
  return {
    due: now + (rating === 0 ? 600000 : interval * 86400000),
    interval,
    reviews: (old?.reviews || 0) + 1,
    lastReviewed: now,
    rating,
  };
}
export function ankiText(entries: CardEntry[], extra = false) {
  const html = (s: string) =>
    s
      .replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c]!,
      )
      .replace(/\r?\n/g, "<br>");
  const quote = (s: string) => '"' + s.replace(/"/g, '""') + '"';
  const headers = [
    "#separator:Tab",
    "#html:true",
    "#tags column:" + (extra ? 4 : 3),
    "#columns:" +
      (extra ? "Question\tAnswer\tExplanation\tTags" : "Front\tBack\tTags"),
  ];
  if (!extra) headers.push("#notetype:Basic");
  return (
    headers.join("\n") +
    "\n" +
    entries
      .map((e) => {
        const tags = [
          "TESTIT",
          ...e.tags.map((t) =>
            String(t).trim().replace(/\s+/g, "_").replace(/["<>]/g, ""),
          ),
        ].join(" ");
        return (
          extra
            ? [
                html(e.card.question),
                html(e.card.answer),
                html(e.card.explanation),
                tags,
              ]
            : [
                html(e.card.question),
                html(e.card.answer) + "<br><br>" + html(e.card.explanation),
                tags,
              ]
        )
          .map(quote)
          .join("\t");
      })
      .join("\n") +
    "\n"
  );
}
