import type { ReactNode } from "react";
import { questionBlocks } from "../domain/paragraphs";
function marked(
  text: string,
  start: number,
  end: number,
  ranges: [number, number][],
): ReactNode[] {
  const output: ReactNode[] = [];
  let cursor = start;
  for (const [a, b] of ranges) {
    const from = Math.max(start, a),
      to = Math.min(end, b);
    if (from >= to) continue;
    output.push(
      text.slice(cursor, from),
      <mark key={`${from}-${to}`}>{text.slice(from, to)}</mark>,
    );
    cursor = to;
  }
  output.push(text.slice(cursor, end));
  return output;
}
export function ClinicalText({
  text,
  ranges,
}: {
  text: string;
  ranges: [number, number][];
}) {
  const blocks = questionBlocks(text);
  if (blocks.length === 1) return <>{marked(text, 0, text.length, ranges)}</>;
  return (
    <>
      {blocks.map((b) => (
        <p
          className={b.lead ? "stem-paragraph stem-lead-in" : "stem-paragraph"}
          key={b.start}
        >
          {marked(text, b.start, b.end, ranges)}
        </p>
      ))}
    </>
  );
}
