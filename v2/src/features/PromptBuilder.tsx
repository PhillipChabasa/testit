import { useRef, useState } from "react";
import {
  ArrowRight,
  Check,
  Clipboard,
  Download,
  FileJson,
  Save,
  Sparkles,
  Upload,
} from "lucide-react";
import { Badge, Button } from "../components/ui";
import { buildPrompt, buildReviewPrompt, defaultSpec } from "../domain/prompts";
import type { PromptSpec } from "../domain/prompts";
import { download, importQuiz, touch } from "../repositories/storage";
interface Preset {
  name: string;
  state: Record<string, unknown>;
  savedAt: number;
}
function presets(): Preset[] {
  const p = JSON.parse(localStorage.getItem("testit_prompt_presets") || "[]");
  if (!Array.isArray(p))
    throw Error(
      "Existing prompt presets could not be read. Export a backup before repairing them.",
    );
  return p;
}
export function PromptBuilder({
  onImported,
  onPractice,
  onNotify,
}: {
  onImported: () => void;
  onPractice: () => void;
  onNotify: (s: string) => void;
}) {
  const [spec, setSpec] = useState<PromptSpec>({ ...defaultSpec }),
    [prompt, setPrompt] = useState(""),
    [generated, setGenerated] = useState(""),
    [response, setResponse] = useState(""),
    [error, setError] = useState(""),
    [imported, setImported] = useState(false),
    [presetName, setPresetName] = useState(""),
    [saved, setSaved] = useState<Preset[]>(() => {
      try {
        return presets();
      } catch {
        return [];
      }
    }),
    [review, setReview] = useState(false);
  const output = useRef<HTMLTextAreaElement>(null),
    responseInput = useRef<HTMLTextAreaElement>(null);
  function change<K extends keyof PromptSpec>(k: K, v: PromptSpec[K]) {
    setSpec({ ...spec, [k]: v });
    setError("");
  }
  function generate() {
    try {
      setPrompt(buildPrompt(spec));
      setGenerated(JSON.stringify(spec));
      setReview(false);
      setError("");
      onNotify(
        "Prompt ready. Copy it into your preferred AI, then paste its JSON below.",
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(prompt);
      onNotify("Prompt copied. Paste it into your AI chat.");
    } catch {
      output.current?.focus();
      output.current?.select();
      onNotify(
        "Automatic copy is unavailable. The prompt is selected; press Ctrl+C or use your device’s Copy action.",
      );
    }
  }
  function savePreset() {
    try {
      if (!presetName.trim()) throw Error("Give this preset a name first.");
      const next = presets(),
        entry: Preset = {
          name: presetName.trim(),
          savedAt: Date.now(),
          state: {
            mode: spec.source ? "source" : "topic",
            difficulty:
              (
                {
                  Foundational: "easy",
                  Moderate: "medium",
                  Challenging: "hard",
                  Mixed: "medium",
                } as Record<string, string>
              )[spec.difficulty] || "medium",
            count: spec.count,
            opts: spec.options,
            topic: spec.topic,
            extra: spec.instructions,
            qtypes: spec.types.map(
              (t) =>
                (
                  ({
                    "Clinical vignette": "Clinical Vignette",
                    "Best next step": "Best Next Step",
                    "Clinical reasoning": "Multi-step Reasoning",
                    Diagnosis: "Clinical Vignette",
                    Mechanism: "Mechanism Identification",
                    "Investigation interpretation": "Scenario-Based",
                  }) as Record<string, string>
                )[t] || t,
            ),
            explanations: true,
            tags: true,
            adversarial: false,
            nearMiss: true,
            medicalSpec: spec,
          },
        };
      const i = next.findIndex((p) => p.name === entry.name);
      if (i >= 0) next[i] = entry;
      else next.push(entry);
      localStorage.setItem("testit_prompt_presets", JSON.stringify(next));
      touch();
      setSaved(next);
      onNotify("Specifications saved in your backed-up prompt presets.");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  function loadPreset(name: string) {
    const p = saved.find((p) => p.name === name);
    if (!p) return;
    const s = p.state || {};
    const medical = s.medicalSpec as Partial<PromptSpec> | undefined;
    setSpec({
      ...defaultSpec,
      ...medical,
      topic: typeof s.topic === "string" ? s.topic : "",
      count: Number(s.count) || 10,
      options: Number(s.opts) || 5,
      instructions: typeof s.extra === "string" ? s.extra : "",
      difficulty:
        medical?.difficulty ||
        (typeof s.difficulty === "string"
          ? (
              {
                easy: "Foundational",
                medium: "Moderate",
                hard: "Challenging",
              } as Record<string, string>
            )[s.difficulty] || "Mixed"
          : "Mixed"),
      types:
        medical?.types ||
        (Array.isArray(s.qtypes) && s.qtypes.length
          ? s.qtypes.filter((t): t is string => typeof t === "string")
          : defaultSpec.types),
    });
    setPresetName(p.name);
    setError("");
  }
  function importResponse() {
    try {
      importQuiz(response);
      setImported(true);
      setError("");
      onImported();
      onNotify(
        "AI question bank imported. Your questions and concept cards are ready to study.",
      );
    } catch (e) {
      setImported(false);
      setError((e as Error).message);
    }
  }
  return (
    <div className="page authoring-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">
            FROM YOUR SPECIFICATIONS TO YOUR QUESTION BANK
          </div>
          <h1>
            Create questions with AI<span className="violet">.</span>
          </h1>
          <p>Set the brief. Copy a prompt. Bring the JSON back here.</p>
        </div>
        <Badge tone="lavender">
          <Sparkles size={14} />
          Your AI, your workflow
        </Badge>
      </div>
      <div className="authoring-steps">
        <span>
          <b>1</b>Specify your questions
        </span>
        <ArrowRight size={15} />
        <span>
          <b>2</b>Copy into your AI
        </span>
        <ArrowRight size={15} />
        <span>
          <b>3</b>Import its JSON
        </span>
      </div>
      <div className="authoring-grid">
        <section className="surface">
          <div className="section-heading">
            <div>
              <h2>
                <span className="step-number">01</span>Your specifications
              </h2>
              <p>
                Use a topic, your learning objectives, or pasted study material.
              </p>
            </div>
            <Sparkles size={20} />
          </div>
          {saved.length > 0 && (
            <label className="field">
              Load saved specifications
              <select
                defaultValue=""
                aria-label="Load saved specifications"
                onChange={(e) => loadPreset(e.target.value)}
              >
                <option value="" disabled>
                  Choose a preset
                </option>
                {saved.map((p) => (
                  <option key={p.name} value={p.name}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label className="field">
            Topic or bank title
            <input
              aria-label="Topic or bank title"
              placeholder="e.g. Acute kidney injury and electrolyte disorders"
              value={spec.topic}
              onChange={(e) => change("topic", e.target.value)}
            />
          </label>
          <label className="field">
            Curriculum
            <select
              value={spec.curriculum}
              aria-label="Curriculum"
              onChange={(e) =>
                change("curriculum", e.target.value as PromptSpec["curriculum"])
              }
            >
              <option value="sa">South African final-year MBChB</option>
              <option value="usmle">USMLE Step 2 CK style</option>
            </select>
          </label>
          <div className="form-row">
            <label className="field">
              Discipline
              <input
                value={spec.subject}
                onChange={(e) => change("subject", e.target.value)}
              />
            </label>
            <label className="field">
              Clinical system
              <input
                placeholder="e.g. Renal"
                value={spec.system}
                onChange={(e) => change("system", e.target.value)}
              />
            </label>
          </div>
          <div className="form-row">
            <label className="field">
              Question count
              <input
                aria-label="AI question count"
                type="number"
                min={1}
                max={100}
                value={spec.count}
                onChange={(e) => change("count", Number(e.target.value))}
              />
            </label>
            <label className="field">
              Options per question
              <select
                value={spec.options}
                aria-label="Options per question"
                onChange={(e) => change("options", Number(e.target.value))}
              >
                {[2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} options
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field">
            Difficulty
            <select
              value={spec.difficulty}
              aria-label="Difficulty"
              onChange={(e) => change("difficulty", e.target.value)}
            >
              {["Foundational", "Moderate", "Challenging", "Mixed"].map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </label>
          <div className="field-label">Question styles</div>
          <div className="filter-chips">
            {[
              ...new Set([
                "Clinical vignette",
                "Best next step",
                "Clinical reasoning",
                "Diagnosis",
                "Mechanism",
                "Investigation interpretation",
                ...spec.types,
              ]),
            ].map((t) => (
              <button
                key={t}
                type="button"
                className={`filter-chip ${spec.types.includes(t) ? "selected" : ""}`}
                aria-pressed={spec.types.includes(t)}
                onClick={() =>
                  change(
                    "types",
                    spec.types.includes(t)
                      ? spec.types.filter((v) => v !== t)
                      : [...spec.types, t],
                  )
                }
              >
                {spec.types.includes(t) && <Check size={12} />} {t}
              </button>
            ))}
          </div>
          <label className="field">
            Learning objectives
            <textarea
              aria-label="Learning objectives"
              placeholder="What should the student be able to diagnose, explain or decide?"
              value={spec.objectives}
              onChange={(e) => change("objectives", e.target.value)}
            />
          </label>
          <label className="field">
            Source material or notes{" "}
            <span>
              Optional. Include reference titles, dates and relevant excerpts.
              Avoid identifiable patient information.
            </span>
            <textarea
              aria-label="Source material or notes"
              placeholder="Paste your notes, guideline excerpts, or lecture material…"
              value={spec.source}
              onChange={(e) => change("source", e.target.value)}
            />
          </label>
          <label className="field">
            Additional specifications
            <textarea
              aria-label="Additional specifications"
              placeholder="e.g. Prioritize emergency presentations; include lab values with units; avoid paediatrics."
              value={spec.instructions}
              onChange={(e) => change("instructions", e.target.value)}
            />
          </label>
          <div className="authoring-guarantees">
            <Check size={15} />
            <span>
              Every prompt requires explanations for all options and one concept
              revision card per question.
            </span>
          </div>
          <Button variant="primary" onClick={generate}>
            Generate prompt
            <Sparkles size={16} />
          </Button>
          <div className="authoring-presets">
            <label className="field">
              Preset name
              <input
                placeholder="Save these specifications for later"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
              />
            </label>
            <Button onClick={savePreset}>
              <Save size={15} />
              Save specifications
            </Button>
          </div>
        </section>
        <div className="authoring-output">
          <section className="surface">
            <div className="section-heading">
              <div>
                <h2>
                  <span className="step-number">02</span>Your AI prompt
                </h2>
                <p>
                  Copy this into ChatGPT, Claude, Gemini, or your preferred AI.
                </p>
              </div>
              <Clipboard size={20} />
            </div>
            {prompt ? (
              <>
                <div className="button-row">
                  <Button variant="primary" onClick={copy}>
                    <Clipboard size={15} />
                    Copy prompt
                  </Button>
                  <Button onClick={() => download("TESTIT-prompt.txt", prompt)}>
                    <Download size={15} />
                    Download
                  </Button>
                </div>
                {generated !== JSON.stringify(spec) && !review && (
                  <p className="authoring-hint">
                    Specifications changed. Generate the prompt again to include
                    your latest edits.
                  </p>
                )}
                <label className="field">
                  {review ? "Clinical review prompt" : "Generated prompt"}
                  <textarea
                    ref={output}
                    aria-label="Generated AI prompt"
                    className="prompt-output"
                    readOnly
                    value={prompt}
                  />
                </label>
                <p className="authoring-hint">
                  Paste this prompt into your AI chat. Ask it to return the
                  complete JSON object, then copy that response into step 3.
                </p>
              </>
            ) : (
              <div className="prompt-placeholder">
                <Sparkles size={30} />
                <h3>Your brief becomes a better prompt.</h3>
                <p>Fill in your specifications, then choose Generate prompt.</p>
              </div>
            )}
          </section>
          <section className="surface">
            <div className="section-heading">
              <div>
                <h2>
                  <span className="step-number">03</span>Bring the JSON back
                </h2>
                <p>Paste the AI’s response, or upload its JSON file.</p>
              </div>
              <FileJson size={20} />
            </div>
            <label className="authoring-upload">
              <Upload size={16} />
              Upload AI JSON
              <input
                aria-label="Upload AI JSON"
                type="file"
                accept=".json,application/json,.txt"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (f)
                    try {
                      setResponse(await f.text());
                      setImported(false);
                    } catch (err) {
                      setError((err as Error).message);
                    }
                  e.target.value = "";
                }}
              />
            </label>
            <label className="field">
              AI response JSON
              <textarea
                ref={responseInput}
                aria-label="AI response JSON"
                className="json-input"
                value={response}
                placeholder={
                  '{ "title": "My medical bank", "questions": [...] }'
                }
                onChange={(e) => {
                  setResponse(e.target.value);
                  setImported(false);
                  setError("");
                }}
              />
            </label>
            <div className="button-row">
              <Button
                variant="primary"
                disabled={!response.trim()}
                onClick={importResponse}
              >
                <FileJson size={16} />
                Import AI questions
              </Button>
              <Button
                disabled={!response.trim()}
                onClick={() => {
                  setPrompt(buildReviewPrompt(response, spec));
                  setReview(true);
                  onNotify(
                    "Independent review prompt ready in step 2. Use a separate AI conversation, then paste the revised JSON back.",
                  );
                }}
              >
                Create review prompt
              </Button>
            </div>
            {imported && (
              <div className="authoring-success">
                <Check size={18} />
                <div>
                  <strong>Question bank imported.</strong>
                  <p>Your concept cards are also available in Revision.</p>
                  <Button variant="primary" onClick={onPractice}>
                    Build a practice session
                    <ArrowRight size={15} />
                  </Button>
                </div>
              </div>
            )}
            <p className="authoring-hint">
              Import checks structure, not medical accuracy. AI output stays
              unreviewed; check questionable items against trusted references
              before studying.
            </p>
          </section>
        </div>
      </div>
      {error && (
        <div className="authoring-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
