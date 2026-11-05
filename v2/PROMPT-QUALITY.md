# Clinical question-authoring standard

The native generator now uses a clinical decision blueprint, realistic case construction, competitive distractors, evidence checks, and a fresh review before JSON output. The goal is original questions with strong educational value. It does not reproduce a proprietary bank, infer human approval, or claim validated equivalence.

## What changed

- Each item has an educational objective and clinical task. The vignette must contribute to the answer; a patient name around a recall fact is insufficient.
- Difficulty is defined by cognitive work. Mixed banks receive a feasible distribution whose counts sum to the requested total. These labels are authoring targets, not measured item difficulty.
- Cases establish the relevant setting, time course, stability, prior actions and constraints. The prompt distinguishes initial investigation, confirmation, stabilization and definitive management.
- Options answer the same lead-in. The nearest alternative must be plausible and defeated by information in the stem. A counterfactual tests whether a meaningful clinical change would make it preferable.
- Main explanations use case synthesis, positive justification, comparison with the strongest alternative, and a transferable take-home point. Every option has a separate case-specific rationale. References to displayed answer letters are prohibited because TESTIT shuffles options.
- Concept cards preserve conditional clinical rules rather than turning a case-specific answer into universal advice.
- Source claims distinguish verification from familiarity. Unsupported decisive facts and unresolved multiple-best-answer items require revision or rejection. Every generated item remains unreviewed.
- The separate reviewer now receives the selected jurisdiction, learning objectives, additional specifications and source packet. It can challenge the key and revise all dependent fields. Unresolved clinical failures must produce an error/rejection report instead of an importable bank.

Existing JSON keys and legacy presets remain compatible. New educational metadata is additive. Existing quizzes and explanations are not rewritten. Regenerate a prompt to apply the standard to new AI work; saved specifications automatically use the new generator.

## Basis

The design draws on [NBME's item-writing guidance](https://www.nbme.org/institutions/nbme-item-writing-guide/) and its [one-best-answer guidance](https://www.nbme.org/sites/default/files/2021-02/NBME_Item%20Writing%20Guide_R_6.pdf): applied knowledge, focused lead-ins, plausible alternatives, and avoidance of cueing. [UWorld's public Step 2 CK overview](https://medical.uworld.com/usmle/usmle-step-2-ck/) describes the educational product being used as a benchmark for usefulness; no proprietary question content or internal authoring process was used.

## Evaluating actual generated content

Prompt-contract tests establish software behavior, not clinical quality. A clinician should compare old and new outputs on the same representative objectives, source packet and model settings. Reviewers should be blinded to prompt version where practical.

Use pass / revise / reject separately for objective alignment, case coherence, uniqueness of the best answer, appropriate reasoning demand, distractor plausibility, explanation usefulness, reference support and local applicability. An unresolved key error, competing correct answer, unsupported decisive claim or wrong jurisdiction blocks clinical acceptance regardless of strengths elsewhere.

Useful outcome measures are clinician acceptance rate, substantive key/management errors, ambiguity, nonfunctioning distractors and missing/contradictory rationales. Do not present these software checks or an AI self-rating as psychometric validation. Learner response data and adequate samples are needed for measured difficulty and discrimination.

The implementation was checked for prompt generation, valid example JSON across 2–6 options, feasible mixed-difficulty counts, review-context propagation, and the browser copy/review/import workflow. No live AI-generated bank was clinically benchmarked as part of this change.
