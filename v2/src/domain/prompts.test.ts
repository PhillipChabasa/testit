import { describe, it, expect } from "vitest";
import { buildPrompt, buildReviewPrompt, defaultSpec } from "./prompts";
import { validateQuiz } from "./engine";
describe("medical prompt contract", () => {
  it("includes the learner specifications and compatible JSON shape", () => {
    const text = buildPrompt({
      ...defaultSpec,
      topic: "Renal medicine",
      count: 12,
      options: 4,
      source: "My lecture notes",
      instructions: "Focus on interpretation",
      objectives: "Distinguish renal causes",
    });
    expect(text).toContain("exactly 12");
    expect(text).toContain("exactly 4");
    expect(text).toContain("South African final-year MBChB");
    expect(text).toContain("My lecture notes");
    expect(text).toContain("Focus on interpretation");
    expect(text).toContain("Distinguish renal causes");
    expect(text).toContain('"option_explanations"');
    expect(text).toContain('"concept_card"');
    expect(text).not.toContain('"e":');
  });
  it("rejects incomplete specifications and distinguishes jurisdictions", () => {
    expect(() => buildPrompt(defaultSpec)).toThrow("topic");
    expect(() =>
      buildPrompt({ ...defaultSpec, topic: "Renal", count: 1.5 }),
    ).toThrow();
    expect(() =>
      buildPrompt({ ...defaultSpec, topic: "Renal", types: [] }),
    ).toThrow();
    expect(
      buildPrompt({ ...defaultSpec, topic: "Renal", curriculum: "usmle" }),
    ).toContain("USMLE Step 2 CK style");
  });
  it("requires all-option explanations and permits key corrections during review", () => {
    const p = buildPrompt({ ...defaultSpec, topic: "Renal" });
    expect(p).toContain("justify EVERY option");
    expect(p).toContain(
      "correct the stem, key, options AND explanations together",
    );
    expect(p).toContain("Never fabricate citations");
    const review = buildReviewPrompt('{"title":"Fixture"}');
    expect(review).toContain("separate AI conversation");
    expect(review).toContain('{"title":"Fixture"}');
    expect(review).toContain("human approval");
  });
  it("keeps the generated schema importable with complete rationales for 2–6 options", () => {
    for (const options of [2, 3, 4, 5, 6]) {
      const prompt = buildPrompt({
        ...defaultSpec,
        topic: "Clinical assessment",
        options,
      });
      const example = JSON.parse(
        prompt.slice(prompt.lastIndexOf("\n{\n")).trim(),
      );
      expect(() => validateQuiz(example)).not.toThrow();
      const q = example.questions[0];
      expect(Object.keys(q.options)).toHaveLength(options);
      expect(Object.keys(q.option_explanations)).toEqual(
        Object.keys(q.options),
      );
      expect(q.review_status).toBe("unreviewed");
      expect(q.verification_status).toBe("unverified");
      expect(q.educational_objective).toBeTruthy();
      expect(q.clinical_task).toBeTruthy();
      expect(q.explanation).toContain("\n\nClosest alternative:");
    }
  });
  it("allocates small and large mixed banks without impossible quotas", () => {
    for (const count of [1, 2, 3, 10, 37, 100]) {
      const prompt = buildPrompt({
        ...defaultSpec,
        topic: "Clinical assessment",
        count,
      });
      const match = prompt.match(
        /Mixed blueprint: (\d+) foundational, (\d+) moderate and (\d+) challenging/,
      )!;
      expect(Number(match[1]) + Number(match[2]) + Number(match[3])).toBe(
        count,
      );
    }
    expect(
      buildPrompt({
        ...defaultSpec,
        topic: "Clinical assessment",
        difficulty: "hard",
      }),
    ).toContain("Challenging: resolve competing plausible interpretations");
    expect(
      buildPrompt({
        ...defaultSpec,
        topic: "Clinical assessment",
        difficulty: "easy",
      }),
    ).toContain("Foundational: apply a core principle");
  });
  it("carries jurisdiction and source evidence into independent review and blocks unresolved items", () => {
    const review = buildReviewPrompt('{"title":"Case bank"}', {
      ...defaultSpec,
      topic: "Renal decisions",
      source: "Provided source packet",
      objectives: "Select the appropriate investigation",
      instructions: "District-level care",
    });
    expect(review).toContain("South African final-year MBChB");
    expect(review).toContain("Provided source packet");
    expect(review).toContain("District-level care");
    expect(review).toContain("Select the appropriate investigation");
    expect(review).toContain("rejected_items");
    expect(review).toContain("instead of an importable bank");
    expect(review).toContain("not displayed answer letters");
    expect(
      buildReviewPrompt("{}", { ...defaultSpec, curriculum: "usmle" }),
    ).toContain("USMLE Step 2 CK style, US clinical setting");
  });
});
