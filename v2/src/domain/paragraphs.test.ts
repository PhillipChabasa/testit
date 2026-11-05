import { describe, it, expect } from "vitest";
import { questionBlocks } from "./paragraphs";
const stem =
  "A 54-year-old patient attends a district hospital after three days of worsening breathlessness. She describes a gradual decline in exercise tolerance and swelling of both ankles during the preceding month. Her history and medication list are reviewed before the examination. On examination, several relevant cardiovascular and respiratory findings are documented, followed by the initial laboratory results. Which investigation is most appropriate next?";
describe("clinical text presentation", () => {
  it("groups long vignettes and separates the final lead-in without changing a character", () => {
    const blocks = questionBlocks(stem);
    expect(blocks.length).toBeGreaterThanOrEqual(2);
    expect(blocks.map((b) => stem.slice(b.start, b.end)).join("")).toBe(stem);
    expect(stem.slice(blocks.at(-1)!.start)).toBe(
      "Which investigation is most appropriate next?",
    );
    expect(blocks.at(-1)!.lead).toBe(true);
  });
  it("preserves existing paragraph and laboratory line breaks verbatim", () => {
    for (const text of [
      stem.replace("On examination", "\n\nOn examination"),
      stem.replace("On examination", "\nOn examination"),
    ])
      expect(questionBlocks(text)).toEqual([
        { start: 0, end: text.length, lead: false },
      ]);
  });
  it("leaves brief stems alone and does not break after titles or initials", () => {
    expect(questionBlocks("What is cardiac output?")).toHaveLength(1);
    const text = stem.replace(
      "A 54-year-old patient",
      "Dr. Smith, a 54-year-old patient",
    );
    const blocks = questionBlocks(text);
    expect(blocks.map((b) => text.slice(b.start, b.end)).join("")).toBe(text);
    expect(
      blocks.every((b) => !text.slice(b.start, b.end).trim().endsWith("Dr.")),
    ).toBe(true);
  });
});
