import {
  ArrowRight,
  BookOpen,
  Check,
  Clock3,
  GraduationCap,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Badge, Button } from "../components/ui";
import { eligible, list } from "../domain/engine";
import type { Bank, Store, TestConfig } from "../domain/types";
export function TestBuilder({
  banks,
  store,
  onStart,
  onImport,
  onCreate,
}: {
  banks: Bank[];
  store: Store;
  onStart: (c: TestConfig) => void;
  onImport: () => void;
  onCreate: () => void;
}) {
  const [c, set] = useState<TestConfig>({
    banks: banks.map((b) => b.key),
    subjects: [],
    systems: [],
    pool: "all",
    count: 10,
    mode: "tutor",
    timed: false,
    minutes: 15,
    name: "",
  });
  const items = eligible(banks, store.attempts, c),
    systems = [
      ...new Set(
        banks.flatMap((b) =>
          b.data.quiz.questions.flatMap((q) =>
            list(q.system ?? b.data.quiz.system),
          ),
        ),
      ),
    ].sort();
  function change<K extends keyof TestConfig>(k: K, v: TestConfig[K]) {
    set({ ...c, [k]: v });
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">PURPOSEFUL PRACTICE</div>
          <h1>
            Make this session yours<span className="violet">.</span>
          </h1>
          <p>A little structure. A lot of possibility.</p>
        </div>
        <Badge tone="lavender">
          <SlidersHorizontal size={14} /> Create a test
        </Badge>
      </div>
      <div className="authoring-entry">
        <span className="action-icon lavender">
          <Sparkles size={22} />
        </span>
        <div>
          <strong>
            Want AI to write new questions from your specifications?
          </strong>
          <p>
            Enter your topic and notes, copy a prompt into your AI, then import
            its JSON response.
          </p>
        </div>
        <Button variant="primary" onClick={onCreate}>
          Create questions with AI
          <ArrowRight size={16} />
        </Button>
      </div>
      <div className="builder-grid">
        <form
          className="builder-form"
          onSubmit={(e) => {
            e.preventDefault();
            onStart({ ...c, count: Math.min(c.count, items.length) });
          }}
        >
          <section className="surface">
            <div className="section-heading">
              <div>
                <h2>
                  <span className="step-number">01</span> Choose your focus
                </h2>
                <p>Select the banks and systems you want to work on.</p>
              </div>
              <BookOpen size={20} />
            </div>
            {banks.length ? (
              <div className="bank-checks">
                {banks.map((b) => (
                  <label
                    className={`bank-choice ${c.banks.includes(b.key) ? "chosen" : ""}`}
                    key={b.key}
                  >
                    <input
                      type="checkbox"
                      checked={c.banks.includes(b.key)}
                      onChange={() =>
                        change(
                          "banks",
                          c.banks.includes(b.key)
                            ? c.banks.filter((k) => k !== b.key)
                            : [...c.banks, b.key],
                        )
                      }
                    />
                    <div>
                      <strong>{b.data.quiz.title || "Untitled bank"}</strong>
                      <small>
                        {b.data.quiz.questions.length} questions ·{" "}
                        {list(b.data.quiz.subject).join(", ")}
                      </small>
                    </div>
                    <Badge>Saved bank</Badge>
                  </label>
                ))}
              </div>
            ) : (
              <div className="gentle-empty">
                <p>Import a question bank to begin.</p>
                <Button onClick={onImport}>Import JSON</Button>
              </div>
            )}
            <div className="field-label">
              Clinical systems <span>All included when none selected</span>
            </div>
            <div className="filter-chips">
              {systems.map((s) => (
                <button
                  type="button"
                  key={s}
                  aria-pressed={c.systems.includes(s)}
                  className={`filter-chip ${c.systems.includes(s) ? "selected" : ""}`}
                  onClick={() =>
                    change(
                      "systems",
                      c.systems.includes(s)
                        ? c.systems.filter((x) => x !== s)
                        : [...c.systems, s],
                    )
                  }
                >
                  {c.systems.includes(s) && <Check size={13} />} {s}
                </button>
              ))}
            </div>
            <label className="field">
              Question pool
              <select
                value={c.pool}
                onChange={(e) => change("pool", e.target.value)}
              >
                <option value="all">All questions</option>
                <option value="unused">Unused questions</option>
                <option value="incorrect">Previously incorrect</option>
                <option value="flagged">Bookmarked questions</option>
              </select>
            </label>
          </section>
          <section className="surface">
            <div className="section-heading">
              <div>
                <h2>
                  <span className="step-number">02</span> Set your rhythm
                </h2>
                <p>Learn as you go, or put your knowledge to the test.</p>
              </div>
            </div>
            <div className="mode-grid">
              {(
                [
                  {
                    id: "tutor",
                    title: "Tutor mode",
                    desc: "Submit each answer to explore the reasoning.",
                    icon: Sparkles,
                  },
                  {
                    id: "exam",
                    title: "Exam mode",
                    desc: "Stay in the flow. Review after you finish.",
                    icon: GraduationCap,
                  },
                ] as const
              ).map((m) => (
                <button
                  type="button"
                  className={`mode-card ${c.mode === m.id ? "selected" : ""}`}
                  aria-pressed={c.mode === m.id}
                  key={m.id}
                  onClick={() => change("mode", m.id)}
                >
                  <m.icon size={23} />
                  <strong>{m.title}</strong>
                  <p>{m.desc}</p>
                  <span className="mode-radio">
                    {c.mode === m.id && <span />}
                  </span>
                </button>
              ))}
            </div>
            <div className="form-row">
              <label className="field">
                Number of questions
                <input
                  aria-label="Number of questions"
                  type="number"
                  min={1}
                  max={Math.max(1, items.length)}
                  value={Math.min(c.count, Math.max(1, items.length))}
                  onChange={(e) => change("count", Number(e.target.value))}
                  required
                />
              </label>
              <label className="field">
                Session name <span>Optional</span>
                <input
                  placeholder="e.g. Morning medicine"
                  value={c.name}
                  onChange={(e) => change("name", e.target.value)}
                />
              </label>
            </div>
            <label className="timer-toggle">
              <span className="action-icon lavender">
                <Clock3 size={21} />
              </span>
              <span>
                <strong>Give yourself a time limit</strong>
                <small>
                  Active time, including tutor explanations. Suspend to pause.
                </small>
              </span>
              <input
                type="checkbox"
                checked={c.timed}
                onChange={(e) => change("timed", e.target.checked)}
              />
            </label>
            {c.timed && (
              <label className="field">
                Duration in minutes
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  max={600}
                  value={c.minutes}
                  onChange={(e) => change("minutes", Number(e.target.value))}
                  required
                />
              </label>
            )}
          </section>
          <Button
            variant="primary"
            className="mobile-start"
            type="submit"
            disabled={!items.length}
          >
            Start session <ArrowRight size={17} />
          </Button>
        </form>
        <aside className="builder-summary surface">
          <span className="eyebrow">YOUR SESSION</span>
          <div className="summary-count">
            {Math.min(c.count, items.length)}
            <span>questions</span>
          </div>
          <div className="summary-line">
            <span>Available pool</span>
            <strong>{items.length}</strong>
          </div>
          <div className="summary-line">
            <span>Study mode</span>
            <strong>{c.mode === "tutor" ? "Tutor" : "Exam"}</strong>
          </div>
          <div className="summary-line">
            <span>Timer</span>
            <strong>
              {c.timed ? `${c.minutes} minutes` : "At your own pace"}
            </strong>
          </div>
          <Button
            variant="primary"
            disabled={
              !items.length ||
              c.count < 1 ||
              !Number.isInteger(c.count) ||
              (c.timed && c.minutes <= 0)
            }
            onClick={() =>
              onStart({ ...c, count: Math.min(c.count, items.length) })
            }
          >
            Start session
            <ArrowRight size={17} />
          </Button>
          <p>
            <Check size={14} /> Progress saves after every action.
          </p>
          <div className="summary-quote">
            “Learning is a process,
            <br />
            not a performance.”
          </div>
        </aside>
      </div>
    </div>
  );
}
