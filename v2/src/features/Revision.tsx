import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  Download,
  Layers3,
  Pencil,
  RotateCcw,
} from "lucide-react";
import { Badge, Button, Empty, Modal } from "../components/ui";
import { ankiText } from "../domain/revision";
import { download } from "../repositories/storage";
import type { Bank, CardEntry, Concept } from "../domain/types";
export function Revision({
  entries,
  banks,
  onRate,
  onEdit,
  onError,
}: {
  entries: CardEntry[];
  banks: Bank[];
  onRate: (e: CardEntry, r: number) => boolean;
  onEdit: (e: CardEntry, c: Concept) => boolean;
  onError: (s: string) => void;
}) {
  const [bank, setBank] = useState("all"),
    [filter, setFilter] = useState("due"),
    [queue, setQueue] = useState<string[] | null>(null),
    [revealed, setRevealed] = useState(false),
    [reviewed, setReviewed] = useState(0),
    [edit, setEdit] = useState(false),
    [draft, setDraft] = useState<Concept>({
      question: "",
      answer: "",
      explanation: "",
    });
  const chosen = entries.filter(
    (e) =>
      (bank === "all" || e.slot === bank) &&
      (filter === "all" ||
        (filter === "due" && (!e.schedule || e.schedule.due <= Date.now())) ||
        (filter === "wrong" && e.wrong) ||
        (filter === "flagged" && e.flagged)),
  );
  const current = queue?.length
    ? entries.find((e) => e.key === queue[0])
    : undefined;
  function rate(r: number) {
    if (!current || !revealed || !onRate(current, r)) return;
    setQueue((q) =>
      q ? [...q.slice(1), ...(r === 0 ? [current.key] : [])] : null,
    );
    setReviewed((n) => n + 1);
    setRevealed(false);
  }
  useEffect(() => {
    function key(e: KeyboardEvent) {
      if (
        edit ||
        (e.target as HTMLElement).closest(
          'input,textarea,select,button,[role="dialog"]',
        ) ||
        !current
      )
        return;
      if (e.code === "Space") {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && /^[1-4]$/.test(e.key)) {
        e.preventDefault();
        rate(Number(e.key) - 1);
      }
    }
    document.addEventListener("keydown", key);
    return () => document.removeEventListener("keydown", key);
  });
  function exportCards(extra: boolean) {
    if (!chosen.length) {
      onError("No concept cards match the selected bank and filter.");
      return;
    }
    download(
      `TESTIT-concepts-${extra ? "Basic-Extra" : "Basic"}.txt`,
      ankiText(chosen, extra),
    );
  }
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">UNDERSTANDING THAT STAYS</div>
          <h1>
            Return to the concept<span className="violet">.</span>
          </h1>
          <p>Recall first. Reveal second. Make the connection last.</p>
        </div>
        <Badge tone="lavender">
          <Layers3 size={14} />
          {entries.length} concept cards
        </Badge>
      </div>
      <section className="surface revision-controls">
        <label className="field">
          Question bank
          <select
            value={bank}
            onChange={(e) => {
              setBank(e.target.value);
              setQueue(null);
            }}
          >
            <option value="all">All saved banks</option>
            {banks.map((b) => (
              <option key={b.key} value={b.key}>
                {b.data.quiz.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          Practice filter
          <select
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setQueue(null);
            }}
          >
            <option value="due">Due + new cards</option>
            <option value="all">All concepts</option>
            <option value="wrong">Missed MCQs</option>
            <option value="flagged">Bookmarked MCQs</option>
          </select>
        </label>
        <Button
          variant="primary"
          disabled={!chosen.length}
          onClick={() => {
            setQueue(chosen.map((e) => e.key));
            setRevealed(false);
            setReviewed(0);
          }}
        >
          Start revision
          <ArrowRight size={16} />
        </Button>
      </section>
      <div className="revision-stage">
        <AnimatePresence mode="wait">
          {current ? (
            <motion.article
              className="revision-card surface"
              key={current.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <div className="revision-card-top">
                <Badge tone="lavender">ACTIVE RECALL</Badge>
                <span>
                  {reviewed} reviewed · {queue?.length} remaining
                </span>
              </div>
              <span className="revision-decoration" aria-hidden="true">
                ✳
              </span>
              <h2>{current.card.question}</h2>
              {revealed ? (
                <div className="revealed-concept">
                  <span className="eyebrow">THE CONNECTION</span>
                  <h3>{current.card.answer}</h3>
                  <p>{current.card.explanation}</p>
                  <div className="rating-buttons">
                    {["Again", "Hard", "Good", "Easy"].map((label, r) => {
                      const interval =
                        r === 0
                          ? "10 min + repeat"
                          : r === 1
                            ? "1 day"
                            : `${r === 2 ? Math.max(2, (current.schedule?.interval || 1) * 2) : Math.max(4, (current.schedule?.interval || 1) * 3)} days`;
                      return (
                        <button
                          key={label}
                          className={`rating rating-${r}`}
                          onClick={() => rate(r)}
                        >
                          <strong>{label}</strong>
                          <small>{interval}</small>
                          <kbd>{r + 1}</kbd>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="recall-prompt">
                  <p>Take a moment. Say the answer in your own words.</p>
                  <Button variant="primary" onClick={() => setRevealed(true)}>
                    Reveal answer
                    <ArrowRight size={16} />
                  </Button>
                  <small>or press Space</small>
                </div>
              )}
              <div className="revision-card-bottom">
                <span>{current.title}</span>
                <div>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDraft({ ...current.card });
                      setEdit(true);
                    }}
                  >
                    <Pencil size={14} />
                    Edit card
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setQueue((q) => q?.slice(1) || null);
                      setRevealed(false);
                    }}
                  >
                    Skip
                    <ArrowRight size={14} />
                  </Button>
                </div>
              </div>
            </motion.article>
          ) : (
            <motion.section
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="surface revision-empty"
            >
              <Empty
                icon={queue ? <Check size={30} /> : <Layers3 size={30} />}
                title={
                  queue
                    ? "A good moment to let it settle"
                    : "A little recall goes a long way"
                }
              >
                <p>
                  {queue
                    ? `${reviewed} reviews completed. Your schedule is saved.`
                    : `${chosen.length} concepts match your selection. Start when you’re ready.`}
                </p>
                {queue && (
                  <Button onClick={() => setQueue(null)}>
                    <RotateCcw size={16} />
                    Back to revision
                  </Button>
                )}
              </Empty>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
      <section className="surface anki-panel">
        <div>
          <h2>Take your concepts to Anki</h2>
          <p>
            Export the selected bank and filter. Your existing TESTIT schedules
            remain here.
          </p>
        </div>
        <div className="button-row">
          <Button onClick={() => exportCards(false)}>
            <Download size={16} />
            Standard Basic
          </Button>
          <Button onClick={() => exportCards(true)}>
            <Download size={16} />
            Basic + Extra
          </Button>
        </div>
      </section>
      <Modal
        open={edit}
        onOpenChange={setEdit}
        title="Refine this concept"
        description="Editing a concept starts a fresh schedule for its new content. Previous schedules remain recoverable in backups."
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (current && onEdit(current, draft)) {
              setQueue(null);
              setEdit(false);
            }
          }}
        >
          {(["question", "answer", "explanation"] as const).map((k) => (
            <label className="field" key={k}>
              {k.charAt(0).toUpperCase() + k.slice(1)}
              <textarea
                required
                value={draft[k]}
                onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
              />
            </label>
          ))}
          <div className="dialog-actions">
            <Button type="submit" variant="primary">
              Save concept
              <Check size={15} />
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
