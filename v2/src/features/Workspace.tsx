import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  Check,
  CheckCircle2,
  ChevronLeft,
  Clock3,
  Highlighter,
  Keyboard,
  LayoutPanelLeft,
  List,
  Pause,
  RotateCcw,
  Scissors,
  X,
  XCircle,
} from "lucide-react";
import { Badge, Button, Modal } from "../components/ui";
import { ClinicalText } from "../components/ClinicalText";
import { list, score, time } from "../domain/engine";
import type { Attempt } from "../domain/types";
export function Workspace({
  attempt,
  onChange,
  onSuspend,
  onFinish,
  onExit,
  saveError,
}: {
  attempt: Attempt;
  onChange: (fn: (a: Attempt) => void) => void;
  onSuspend: () => void;
  onFinish: () => void;
  onExit: () => void;
  saveError: string;
}) {
  const a = attempt,
    item = a.items[a.index],
    q = item.question,
    key = item.key,
    done = a.status === "completed",
    revealed = done || (a.mode === "tutor" && a.submitted.includes(key)),
    answer = a.answers[key],
    flag = a.flags.includes(key),
    ranges = a.highlights[key] || [];
  const [nav, setNav] = useState(false),
    [finish, setFinish] = useState(false),
    [shortcuts, setShortcuts] = useState(false),
    [tab, setTab] = useState<"question" | "explanation">("question"),
    [reviewFilter, setReviewFilter] = useState("all"),
    [announcement, setAnnouncement] = useState("");
  const stem = useRef<HTMLDivElement>(null),
    questionPane = useRef<HTMLDivElement>(null),
    explanationPane = useRef<HTMLElement>(null);
  useEffect(() => {
    setTab("question");
    questionPane.current?.scrollTo(0, 0);
    explanationPane.current?.scrollTo(0, 0);
  }, [key]);
  useEffect(() => {
    if (done) setFinish(false);
  }, [done]);
  function go(index: number) {
    if (index < 0 || index >= a.items.length) return;
    onChange((t) => {
      t.index = index;
    });
    setNav(false);
  }
  function select(option: string) {
    if (revealed || a.status !== "active") return;
    onChange((t) => {
      t.answers[key] = option;
      t.eliminated ||= {};
      t.eliminated[key] = (t.eliminated[key] || []).filter((k) => k !== option);
    });
  }
  function eliminate(option: string) {
    if (revealed || a.status !== "active") return;
    onChange((t) => {
      t.eliminated ||= {};
      const old = t.eliminated[key] || [];
      if (old.includes(option))
        t.eliminated[key] = old.filter((k) => k !== option);
      else {
        t.eliminated[key] = [...old, option];
        if (t.answers[key] === option) delete t.answers[key];
      }
    });
  }
  function toggleFlag() {
    onChange((t) => {
      t.flags = t.flags.includes(key)
        ? t.flags.filter((k) => k !== key)
        : [...t.flags, key];
    });
  }
  function submit() {
    if (
      answer === undefined ||
      revealed ||
      a.mode !== "tutor" ||
      a.status !== "active"
    )
      return;
    onChange((t) => {
      t.submitted.push(key);
      t.responseAt ||= {};
      t.responseAt[key] = Date.now();
    });
    setAnnouncement("Answer submitted. Explanation available.");
  }
  function highlight() {
    const selection = getSelection(),
      el = stem.current;
    if (
      !selection ||
      !el ||
      selection.isCollapsed ||
      !el.contains(selection.anchorNode) ||
      !el.contains(selection.focusNode)
    ) {
      setAnnouncement(
        "Select text in the clinical question, then choose Highlight.",
      );
      return;
    }
    const range = selection.getRangeAt(0),
      before = range.cloneRange();
    before.selectNodeContents(el);
    before.setEnd(range.startContainer, range.startOffset);
    const start = before.toString().length,
      end = start + range.toString().length;
    onChange((t) => {
      const all = [
        ...(t.highlights[key] || []),
        [start, end] as [number, number],
      ].sort((x, y) => x[0] - y[0]);
      const merged: [number, number][] = [];
      for (const r of all) {
        const last = merged.at(-1);
        if (last && r[0] <= last[1]) last[1] = Math.max(last[1], r[1]);
        else merged.push([...r]);
      }
      t.highlights[key] = merged;
    });
    selection.removeAllRanges();
    setAnnouncement("Highlight saved.");
  }
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        finish ||
        shortcuts ||
        e.ctrlKey ||
        e.metaKey ||
        e.altKey ||
        (e.target as HTMLElement)?.closest(
          'input,textarea,select,[contenteditable="true"],[role="dialog"]',
        )
      )
        return;
      if (e.key === "ArrowRight") {
        e.preventDefault();
        go(a.index + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(a.index - 1);
      } else if (e.key.toLowerCase() === "f") {
        e.preventDefault();
        toggleFlag();
      } else if (e.key.toLowerCase() === "h") {
        e.preventDefault();
        highlight();
      } else if (/^[1-9]$/.test(e.key)) {
        const k = item.order[Number(e.key) - 1];
        if (k) {
          e.preventDefault();
          select(k);
        }
      } else if (
        e.key === "Enter" &&
        !(e.target as HTMLElement).closest("button,a")
      ) {
        e.preventDefault();
        submit();
      } else if (e.key === "?") {
        e.preventDefault();
        setShortcuts(true);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  });
  const progress =
      a.mode === "tutor" ? a.submitted.length : Object.keys(a.answers).length,
    results = score(a);
  const visible = a.items.filter(
    (i) =>
      reviewFilter === "all" ||
      (reviewFilter === "flagged" && a.flags.includes(i.key)) ||
      (reviewFilter === "incorrect" &&
        a.answers[i.key] !== undefined &&
        a.answers[i.key] !== i.question.correct_answer) ||
      (reviewFilter === "omitted" && a.answers[i.key] === undefined),
  );
  return (
    <div className="study-shell">
      <a className="skip-link" href="#clinical-question">
        Skip to question
      </a>
      <header className="study-header">
        <div className="study-brand">
          <button
            className="icon-button"
            aria-label={done ? "Back to sessions" : "Suspend and exit"}
            onClick={done ? onExit : onSuspend}
          >
            <ChevronLeft size={21} />
          </button>
          <a
            className="brand"
            href="#dashboard"
            onClick={(e) => {
              e.preventDefault();
              done ? onExit() : onSuspend();
            }}
          >
            testit<span>✳</span>
          </a>
          <span className="study-divider" />
          <div className="session-title">
            <strong>{a.name}</strong>
            <small>
              {a.mode === "tutor" ? "Tutor mode" : "Exam mode"} ·{" "}
              {a.items.length} questions
            </small>
          </div>
        </div>
        <div className="study-header-actions">
          <span className={`save-pill ${saveError ? "failed" : ""}`}>
            <span className="live-dot" />
            {saveError ? "Unsaved changes" : "Saved locally"}
          </span>
          <span
            className={`timer ${a.timed && a.durationMs - a.elapsedMs < 60000 ? "urgent" : ""}`}
            aria-label={a.timed ? "Time remaining" : "Time elapsed"}
          >
            <Clock3 size={16} />
            {time(a.timed ? a.durationMs - a.elapsedMs : a.elapsedMs)}
          </span>
          {!done ? (
            <>
              <Button variant="ghost" aria-label="Suspend" onClick={onSuspend}>
                <Pause size={16} />
                <span className="desktop-only">Suspend</span>
              </Button>
              <Button
                variant="primary"
                aria-label="Finish session"
                onClick={() => setFinish(true)}
              >
                Finish<span className="desktop-only"> session</span>
              </Button>
            </>
          ) : (
            <Badge tone="mint">{results.percent}% · Completed</Badge>
          )}
        </div>
      </header>
      {saveError && (
        <div className="save-warning" role="alert">
          {saveError} Your current session remains in memory. Use “Export
          recovery” before closing.
        </div>
      )}
      <div className="study-subbar">
        <button onClick={() => setNav(!nav)}>
          <List size={17} />
          Question {a.index + 1} of {a.items.length}
        </button>
        <div className="study-progress">
          <span style={{ width: `${(progress / a.items.length) * 100}%` }} />
        </div>
        <span>
          {progress} {a.mode === "tutor" ? "submitted" : "answered"}
        </span>
        <Button
          variant="ghost"
          aria-label="Keyboard shortcuts"
          onClick={() => setShortcuts(true)}
        >
          <Keyboard size={17} />
        </Button>
      </div>
      <div className={`study-body ${revealed ? "has-explanation" : ""}`}>
        <aside className={`study-navigator ${nav ? "open" : ""}`}>
          <div className="navigator-heading">
            <span>YOUR QUESTIONS</span>
            <button
              className="icon-button mobile-only"
              aria-label="Close question navigator"
              onClick={() => setNav(false)}
            >
              <X size={18} />
            </button>
          </div>
          {done && (
            <label className="field">
              Review filter
              <select
                value={reviewFilter}
                onChange={(e) => setReviewFilter(e.target.value)}
              >
                <option value="all">All questions</option>
                <option value="incorrect">Incorrect</option>
                <option value="omitted">Omitted</option>
                <option value="flagged">Bookmarked</option>
              </select>
            </label>
          )}
          <nav className="question-grid" aria-label="Question navigation">
            {visible.map((i) => {
              const n = a.items.indexOf(i),
                answered = a.answers[i.key] !== undefined,
                submitted = a.submitted.includes(i.key),
                showResult = done || (a.mode === "tutor" && submitted);
              return (
                <button
                  key={i.key}
                  onClick={() => go(n)}
                  className={`${n === a.index ? "current" : ""} ${answered ? "answered" : ""} ${showResult ? (a.answers[i.key] === i.question.correct_answer ? "right" : "wrong") : ""}`}
                  aria-current={n === a.index ? "step" : undefined}
                  aria-label={`Question ${n + 1}, ${answered ? "answered" : "unanswered"}${a.flags.includes(i.key) ? ", bookmarked" : ""}`}
                >
                  {n + 1}
                  {a.flags.includes(i.key) && <i />}
                </button>
              );
            })}
          </nav>
          {!visible.length && <p>No questions match.</p>}
          <div className="nav-legend">
            <span>
              <i className="legend-dot answered" />
              Answered
            </span>
            <span>
              <i className="legend-dot" />
              Not answered
            </span>
            <span>
              <Bookmark size={12} />
              Bookmarked
            </span>
          </div>
          <div className="navigator-bottom">
            <SparkleNote />
            <button onClick={() => setShortcuts(true)}>
              <Keyboard size={16} />
              Keyboard shortcuts
            </button>
          </div>
        </aside>
        {nav && (
          <button
            className="navigator-backdrop"
            aria-label="Close question navigation"
            onClick={() => setNav(false)}
          />
        )}
        <div className="reading-area">
          <div className="mobile-study-tabs">
            <button
              className={tab === "question" ? "active" : ""}
              onClick={() => setTab("question")}
            >
              Question
            </button>
            <button
              disabled={!revealed}
              className={tab === "explanation" ? "active" : ""}
              onClick={() => setTab("explanation")}
            >
              Explanation {!revealed && "· locked"}
            </button>
          </div>
          <div
            className={`question-pane ${tab === "explanation" ? "mobile-hidden" : ""}`}
            ref={questionPane}
          >
            <div className="question-meta">
              <div>
                <Badge>{list(q.system).join(" · ")}</Badge>
                <span
                  className="question-id"
                  title="Time spent on this question"
                >
                  #{String(q.id)} · {time(a.questionMs[key] || 0)}
                </span>
              </div>
              <div className="question-tools">
                <button
                  className={flag ? "bookmarked" : ""}
                  onClick={toggleFlag}
                  aria-pressed={flag}
                  aria-label={flag ? "Remove bookmark" : "Bookmark question"}
                  title="Bookmark (F)"
                >
                  <Bookmark size={18} fill={flag ? "currentColor" : "none"} />
                </button>
                <button
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={highlight}
                  aria-label="Highlight selected question text"
                  title="Select text, then highlight (H)"
                >
                  <Highlighter size={18} />
                </button>
                <button
                  onClick={() =>
                    onChange((t) => {
                      delete t.highlights[key];
                    })
                  }
                  disabled={!ranges.length}
                  aria-label="Clear question highlights"
                  title="Clear highlights"
                >
                  <RotateCcw size={16} />
                </button>
              </div>
            </div>
            <div className="question-kicker">CLINICAL QUESTION</div>
            <div
              className="clinical-stem"
              id="clinical-question"
              ref={stem}
              tabIndex={0}
            >
              <ClinicalText text={q.question} ranges={ranges} />
            </div>
            <div className="options-heading">
              <span>Select the single best answer.</span>
              {!revealed && (
                <span>
                  <Scissors size={13} /> Eliminate to think it through
                </span>
              )}
            </div>
            <div
              className="option-list"
              role="radiogroup"
              aria-label="Answer choices"
            >
              {item.order.map((k, n) => {
                const selected = answer === k,
                  eliminated = a.eliminated?.[key]?.includes(k);
                return (
                  <div
                    className={`option-row ${selected ? "selected" : ""} ${eliminated ? "eliminated" : ""} ${revealed && k === q.correct_answer ? "correct" : ""} ${revealed && selected && k !== q.correct_answer ? "incorrect" : ""}`}
                    key={k}
                  >
                    <button
                      className="option-select"
                      role="radio"
                      aria-checked={selected}
                      disabled={revealed || a.status !== "active"}
                      onClick={() => select(k)}
                    >
                      <span className="option-letter">
                        {String.fromCharCode(65 + n)}
                      </span>
                      <span className="option-text">{q.options[k]}</span>
                      {revealed && k === q.correct_answer ? (
                        <CheckCircle2 size={20} />
                      ) : revealed && selected ? (
                        <XCircle size={20} />
                      ) : selected ? (
                        <span className="selected-ring" />
                      ) : null}
                      <span className="sr-only">
                        {revealed && k === q.correct_answer
                          ? "Correct answer"
                          : revealed && selected
                            ? "Your incorrect answer"
                            : ""}
                      </span>
                    </button>
                    {!revealed && (
                      <button
                        className="eliminate-button"
                        aria-label={`${eliminated ? "Restore" : "Eliminate"} option ${String.fromCharCode(65 + n)}`}
                        aria-pressed={!!eliminated}
                        title={
                          eliminated ? "Restore option" : "Eliminate option"
                        }
                        onClick={() => eliminate(k)}
                      >
                        <Scissors size={15} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
            {!revealed && (
              <p className="answer-hint">
                {a.mode === "tutor"
                  ? "Choose an answer, then submit to uncover the reasoning."
                  : "Your answer is saved. Explanations appear when you finish."}
              </p>
            )}
            {revealed && (
              <div
                className={`inline-feedback ${answer === q.correct_answer ? "right" : "wrong"}`}
              >
                {answer === q.correct_answer ? (
                  <CheckCircle2 size={18} />
                ) : (
                  <XCircle size={18} />
                )}
                <span>
                  {answer === undefined
                    ? "Question omitted"
                    : answer === q.correct_answer
                      ? "Well reasoned. Correct answer."
                      : "A chance to build your understanding."}
                </span>
                <button
                  className="text-link mobile-only"
                  onClick={() => setTab("explanation")}
                >
                  See why <ArrowRight size={14} />
                </button>
              </div>
            )}
            <div className="question-source">
              {item.bankTitle}
              <span>·</span>Imported content · Clinical review not verified
            </div>
          </div>
          <AnimatePresence initial={false}>
            {revealed && (
              <motion.section
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className={`explanation-pane ${tab === "question" ? "mobile-hidden" : ""}`}
                ref={explanationPane}
                aria-label="Answer explanation"
              >
                <div className="explanation-heading">
                  <span className="explanation-icon">
                    <LayoutPanelLeft size={18} />
                  </span>
                  <h2>Connect the dots</h2>
                  <Badge tone={answer === q.correct_answer ? "mint" : "peach"}>
                    {answer === undefined
                      ? "Omitted"
                      : answer === q.correct_answer
                        ? "Correct"
                        : "Incorrect"}
                  </Badge>
                </div>
                <div className="correct-answer-label">THE BEST ANSWER</div>
                <h3 className="correct-answer-text">
                  {q.options[q.correct_answer]}
                </h3>
                <div className="explanation-copy">
                  {q.explanation ||
                    "This imported question does not include an explanation. It has not been clinically verified."}
                </div>
                <h3 className="rationale-title">Understand every option</h3>
                <div className="rationale-list">
                  {item.order.map((k, n) => (
                    <article
                      key={k}
                      className={`rationale ${k === q.correct_answer ? "is-correct" : ""}`}
                    >
                      <span className="rationale-letter">
                        {String.fromCharCode(65 + n)}
                      </span>
                      <div>
                        <strong>{q.options[k]}</strong>
                        <p>
                          {q.option_explanations?.[k] ||
                            (k === q.correct_answer
                              ? "See the main explanation above."
                              : "An individual rationale was not included in this bank. Review this alternative against a trusted clinical reference.")}
                        </p>
                      </div>
                      {k === q.correct_answer && <Check size={15} />}
                    </article>
                  ))}
                </div>
                {q.concept_card && (
                  <div className="concept-callout">
                    <Badge tone="lavender">THE TAKE-HOME CONCEPT</Badge>
                    <h3>{q.concept_card.question}</h3>
                    <strong>{q.concept_card.answer}</strong>
                    <p>{q.concept_card.explanation}</p>
                  </div>
                )}
                <div className="evidence-note">
                  Imported explanations are preserved as provided. Source
                  verification and clinical approval are not implied.
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
      <footer className="study-footer">
        <Button
          variant="ghost"
          onClick={() => go(a.index - 1)}
          disabled={a.index === 0}
        >
          <ArrowLeft size={17} />
          <span>Previous</span>
        </Button>
        <span className="footer-tip desktop-only">
          {revealed
            ? "Reflect. Connect. Carry it forward."
            : "Take a breath. Follow the clinical clues."}
        </span>
        <div>
          {done && (
            <Button variant="ghost" onClick={onExit}>
              Session results
            </Button>
          )}
          {!revealed && a.mode === "tutor" ? (
            <Button
              variant="primary"
              disabled={answer === undefined || a.status !== "active"}
              onClick={submit}
            >
              Submit answer
              <Check size={16} />
            </Button>
          ) : a.index < a.items.length - 1 ? (
            <Button variant="primary" onClick={() => go(a.index + 1)}>
              Next question
              <ArrowRight size={17} />
            </Button>
          ) : !done ? (
            <Button variant="primary" onClick={() => setFinish(true)}>
              Finish session
              <Check size={16} />
            </Button>
          ) : null}
          {!revealed && a.mode === "exam" && a.index < a.items.length - 1 && (
            <Button onClick={() => go(a.index + 1)}>
              Next
              <ArrowRight size={17} />
            </Button>
          )}
        </div>
      </footer>
      <div className="sr-only" role="status">
        {announcement}
      </div>
      <Modal
        open={finish}
        onOpenChange={setFinish}
        title="Ready to finish?"
        description="Completed sessions are saved for review. Answers cannot be changed after finishing."
      >
        <div className="finish-summary">
          <strong>
            {Object.keys(a.answers).length} / {a.items.length}
          </strong>
          <p>
            questions answered ·{" "}
            {a.items.length - Object.keys(a.answers).length} omitted
          </p>
        </div>
        <div className="dialog-actions">
          <Button onClick={() => setFinish(false)}>Keep going</Button>
          <Button
            variant="primary"
            onClick={() => {
              setFinish(false);
              onFinish();
            }}
          >
            Finish & review
            <Check size={16} />
          </Button>
        </div>
      </Modal>
      <Modal
        open={shortcuts}
        onOpenChange={setShortcuts}
        title="A little less clicking"
        description="Shortcuts pause while editing text or using a dialog."
      >
        <div className="shortcut-list">
          {[
            ["1–9", "Select an answer"],
            ["← / →", "Previous / next question"],
            ["F", "Toggle bookmark"],
            ["H", "Highlight selected question text"],
            ["Enter", "Submit in Tutor mode from question text"],
            ["?", "Show shortcuts"],
          ].map(([k, v]) => (
            <div key={k}>
              <kbd>{k}</kbd>
              <span>{v}</span>
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
function SparkleNote() {
  return (
    <div className="navigator-note">
      <span>✳</span>
      <p>
        Stay curious.
        <br />
        Think it through.
      </p>
    </div>
  );
}
