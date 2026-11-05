export interface TextBlock {
  start: number;
  end: number;
  lead: boolean;
}
const leadIn = /^(?:Which\b|What\b|How\b|Select\b|Choose\b)/;
/** Presentation boundaries only: never rewrite stored clinical text or highlight offsets. */
export function questionBlocks(text: string): TextBlock[] {
  // Respect authored line breaks, including investigation lists and paragraph breaks.
  if (text.length < 220 || /[\r\n]/.test(text))
    return [{ start: 0, end: text.length, lead: false }];
  const ends: number[] = [];
  const boundaries = /[.!?]["”')\]]*[ \t]+(?=[A-Z0-9“"(])/g;
  for (const match of text.matchAll(boundaries)) {
    const before = text.slice(0, match.index! + 1);
    if (
      /\b(?:Dr|Mr|Mrs|Ms|Prof|Sr|Jr|St|vs|e\.g|i\.e)\.$/i.test(before) ||
      /\b[A-Z]\.$/.test(before)
    )
      continue;
    ends.push(match.index! + match[0].length);
  }
  ends.push(text.length);
  const blocks: TextBlock[] = [];
  let start = 0,
    sentences = 0;
  for (let i = 0; i < ends.length; i++) {
    const end = ends[i];
    sentences++;
    const nextLead = end < text.length && leadIn.test(text.slice(end));
    if (
      end === text.length ||
      nextLead ||
      end - start >= 300 ||
      sentences >= 3
    ) {
      blocks.push({ start, end, lead: leadIn.test(text.slice(start)) });
      start = end;
      sentences = 0;
    }
  }
  return blocks;
}
