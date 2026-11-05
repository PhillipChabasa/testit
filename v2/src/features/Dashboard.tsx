import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  Clock3,
  Flame,
  Layers3,
  Plus,
  Sparkles,
  Target,
} from "lucide-react";
import { Badge, Button } from "../components/ui";
import { list, score, time } from "../domain/engine";
import type { Attempt, Bank, CardEntry } from "../domain/types";
import type { Page } from "../components/Shell";
export function Dashboard({
  banks,
  attempts,
  cards,
  onNavigate,
  onOpen,
  onImport,
  onSample,
}: {
  banks: Bank[];
  attempts: Attempt[];
  cards: CardEntry[];
  onNavigate: (p: Page) => void;
  onOpen: (a: Attempt) => void;
  onImport: () => void;
  onSample: () => void;
}) {
  const finished = attempts.filter((a) => a.status === "completed"),
    resume = attempts.find((a) => a.status !== "completed"),
    total = banks.reduce((s, b) => s + b.data.quiz.questions.length, 0),
    responses = finished.reduce((s, a) => s + score(a).answered, 0),
    correct = finished.reduce((s, a) => s + score(a).correct, 0),
    due = cards.filter(
      (c) => !c.schedule || c.schedule.due <= Date.now(),
    ).length;
  const systems = [
    ...new Set(
      banks.flatMap((b) =>
        b.data.quiz.questions.flatMap((q) =>
          list(q.system ?? b.data.quiz.system),
        ),
      ),
    ),
  ].slice(0, 5);
  return (
    <div className="page dashboard">
      <div className="page-heading">
        <div>
          <div className="eyebrow">LET’S MAKE IT COUNT</div>
          <h1>
            A clearer path to
            <br className="mobile-only" /> clinical confidence
            <span className="violet">.</span>
          </h1>
          <p>Build understanding, one good question at a time.</p>
        </div>
        <Button onClick={onImport}>
          <Plus size={17} />
          Import questions
        </Button>
      </div>
      <section className="hero-card">
        <div className="hero-copy">
          <Badge tone="lavender">
            <span className="small-star">✦</span> YOUR NEXT CHAPTER
          </Badge>
          <h2>
            Think clinically.
            <br />
            <span>Learn deliberately.</span>
          </h2>
          <p>
            A focused space to connect the science,
            <br className="desktop-only" /> sharpen your reasoning, and find
            your rhythm.
          </p>
          <Button
            variant="primary"
            onClick={() => (resume ? onOpen(resume) : onNavigate("builder"))}
          >
            {resume ? "Continue your session" : "Start a practice session"}
            <ArrowRight size={17} />
          </Button>
          <div className="hero-foot">
            <Check size={14} /> Your pace. Your progress. Always saved locally.
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="art-star">✳</div>
          <div className="art-card card-back">
            <div className="art-lines" />
            <div className="art-lines short" />
            <div className="art-circle" />
          </div>
          <div className="art-card card-front">
            <div className="art-card-label">
              <span>CLINICAL REASONING</span>
              <Sparkles size={15} />
            </div>
            <div className="art-heart">✚</div>
            <div className="art-option">
              <span />
              <i />
            </div>
            <div className="art-option selected">
              <Check size={13} />
              <i />
            </div>
            <div className="art-option">
              <span />
              <i />
            </div>
            <div className="art-progress">
              <span />
            </div>
          </div>
          <div className="floating-note">
            <span className="note-check">
              <Check size={16} />
            </span>
            <div>
              Understanding unlocked<small>One connection at a time</small>
            </div>
          </div>
          <div className="art-spark">✦</div>
          <div className="art-dot" />
        </div>
      </section>
      <section className="stats-grid" aria-label="Learning statistics">
        {[
          {
            label: "Questions in your library",
            value: total,
            detail: `Across ${banks.length} saved ${banks.length === 1 ? "bank" : "banks"}`,
            icon: BookOpen,
            color: "violet",
          },
          {
            label: "Practice accuracy",
            value: responses
              ? `${Math.round((correct / responses) * 100)}%`
              : "—",
            detail: responses
              ? `${responses} answered in completed sessions`
              : "Your next session starts the story",
            icon: Target,
            color: "mint",
          },
          {
            label: "Concepts ready to revisit",
            value: due,
            detail: `${cards.length} concept cards in your library`,
            icon: Layers3,
            color: "peach",
          },
          {
            label: "Time invested",
            value: time(attempts.reduce((s, a) => s + a.elapsedMs, 0)),
            detail: `${finished.length} completed sessions`,
            icon: Clock3,
            color: "blue",
          },
        ].map((s) => (
          <article className="stat-card" key={s.label}>
            <div className="stat-top">
              <span>{s.label}</span>
              <div className={`stat-icon ${s.color}`}>
                <s.icon size={18} />
              </div>
            </div>
            <strong>{s.value}</strong>
            <small>{s.detail}</small>
          </article>
        ))}
      </section>
      <div className="dashboard-columns">
        <section className="surface">
          <div className="section-heading">
            <div>
              <h2>Keep your momentum</h2>
              <p>Small steps, meaningful progress.</p>
            </div>
            <Flame size={20} className="peach-text" />
          </div>
          <button
            className="action-row"
            onClick={() => onNavigate("authoring")}
          >
            <span className="action-icon lavender">
              <Sparkles size={22} />
            </span>
            <div>
              <strong>Create questions with AI</strong>
              <p>Set your specifications, copy a prompt, import the JSON.</p>
            </div>
            <ArrowUpRight size={20} />
          </button>
          <button className="action-row" onClick={() => onNavigate("builder")}>
            <span className="action-icon lavender">
              <BookOpen size={22} />
            </span>
            <div>
              <strong>A focused question block</strong>
              <p>Choose your topics. Challenge your reasoning.</p>
            </div>
            <ArrowUpRight size={20} />
          </button>
          <button className="action-row" onClick={() => onNavigate("revision")}>
            <span className="action-icon mint">
              <Layers3 size={22} />
            </span>
            <div>
              <strong>Bring a concept back</strong>
              <p>
                {due
                  ? `${due} concepts ready for a fresh look.`
                  : "Build lasting recall with your concept cards."}
              </p>
            </div>
            <ArrowUpRight size={20} />
          </button>
          <div className="soft-note">
            <Sparkles size={16} />
            <span>Understanding grows when you revisit, not just repeat.</span>
          </div>
        </section>
        <section className="surface">
          <div className="section-heading">
            <div>
              <h2>Your clinical landscape</h2>
              <p>A view of what’s in your question library.</p>
            </div>
            <Button
              variant="ghost"
              aria-label="Open question library"
              onClick={() => onNavigate("library")}
            >
              <ArrowUpRight size={19} />
            </Button>
          </div>
          {systems.length ? (
            systems.map((s, i) => {
              const count = banks.reduce(
                (n, b) =>
                  n +
                  b.data.quiz.questions.filter((q) =>
                    list(q.system ?? b.data.quiz.system).includes(s),
                  ).length,
                0,
              );
              return (
                <div className="system-row" key={s}>
                  <div>
                    <span>
                      <i className={`system-dot c${i}`} />
                      {s}
                    </span>
                    <small>{count} questions</small>
                  </div>
                  <div className="coverage-track">
                    <span
                      style={{ width: `${total ? (count / total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              );
            })
          ) : (
            <div className="gentle-empty">
              <BookOpen size={27} />
              <p>Your library starts with a question.</p>
              <button className="text-link" onClick={onSample}>
                Explore the sample bank <ArrowRight size={15} />
              </button>
            </div>
          )}
        </section>
      </div>
      <section className="surface recent">
        <div className="section-heading">
          <div>
            <h2>Recent sessions</h2>
            <p>Pick up where you left off, or reflect on a completed block.</p>
          </div>
          <Button variant="ghost" onClick={() => onNavigate("history")}>
            View all
            <ArrowRight size={15} />
          </Button>
        </div>
        {attempts.length ? (
          <div className="session-list">
            {attempts.slice(0, 3).map((a) => (
              <button
                key={a.id}
                className="session-row"
                onClick={() => onOpen(a)}
              >
                <span className="session-icon">
                  <BookOpen size={19} />
                </span>
                <div>
                  <strong>{a.name}</strong>
                  <small>
                    {a.items.length} questions ·{" "}
                    {a.mode === "tutor" ? "Tutor" : "Exam"} ·{" "}
                    {new Date(a.createdAt).toLocaleDateString("en-ZA", {
                      day: "numeric",
                      month: "short",
                    })}
                  </small>
                </div>
                <Badge tone={a.status === "completed" ? "mint" : "lavender"}>
                  {a.status === "completed"
                    ? `${score(a).percent}% · Completed`
                    : "Resume session"}
                </Badge>
                <ArrowRight size={17} />
              </button>
            ))}
          </div>
        ) : (
          <div className="first-session">
            <span>No sessions yet. Your first one is a fresh start.</span>
            <button className="text-link" onClick={() => onNavigate("builder")}>
              Create a test <ArrowRight size={15} />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
