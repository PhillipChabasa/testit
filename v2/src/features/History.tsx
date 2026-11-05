import { ArrowRight, BookOpen, Clock3, Play } from "lucide-react";
import { Badge, Button, Empty } from "../components/ui";
import { score, time } from "../domain/engine";
import type { Attempt } from "../domain/types";
export function History({
  attempts,
  onOpen,
  onCreate,
}: {
  attempts: Attempt[];
  onOpen: (a: Attempt) => void;
  onCreate: () => void;
}) {
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">EVERY SESSION ADDS SOMETHING</div>
          <h1>
            Your learning, in motion<span className="violet">.</span>
          </h1>
          <p>Resume a session or revisit the reasoning.</p>
        </div>
        <Button variant="primary" onClick={onCreate}>
          Create a test
          <ArrowRight size={17} />
        </Button>
      </div>
      {attempts.length ? (
        <div className="history-grid">
          {attempts.map((a) => {
            const s = score(a);
            return (
              <article className="surface history-card" key={a.id}>
                <div className="section-heading">
                  <Badge tone={a.status === "completed" ? "mint" : "lavender"}>
                    {a.status === "completed"
                      ? "Completed"
                      : a.status === "active"
                        ? "Interrupted · Resume"
                        : "Suspended"}
                  </Badge>
                  <span>{new Date(a.createdAt).toLocaleDateString()}</span>
                </div>
                <h2>{a.name}</h2>
                <p>
                  {a.mode === "tutor" ? "Tutor" : "Exam"} mode ·{" "}
                  {a.items.length} questions · {a.timed ? "Timed" : "Untimed"}
                </p>
                {a.status === "completed" ? (
                  <div className="result-metrics">
                    <div>
                      <strong>{s.percent}%</strong>
                      <small>Overall score</small>
                    </div>
                    <div>
                      <strong>{s.correct}</strong>
                      <small>Correct</small>
                    </div>
                    <div>
                      <strong>{s.incorrect}</strong>
                      <small>Incorrect</small>
                    </div>
                    <div>
                      <strong>{s.omitted}</strong>
                      <small>Omitted</small>
                    </div>
                  </div>
                ) : (
                  <div className="history-progress">
                    <div>
                      <span>
                        {Object.keys(a.answers).length} / {a.items.length}{" "}
                        answered
                      </span>
                      <Clock3 size={16} />
                    </div>
                    <progress
                      value={Object.keys(a.answers).length}
                      max={a.items.length}
                    />
                  </div>
                )}
                <div className="history-bottom">
                  <span>
                    <Clock3 size={15} />
                    {time(a.elapsedMs)}
                  </span>
                  <Button onClick={() => onOpen(a)}>
                    {a.status === "completed"
                      ? "Review session"
                      : "Resume session"}
                    {a.status === "completed" ? (
                      <ArrowRight size={15} />
                    ) : (
                      <Play size={15} />
                    )}
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="surface">
          <Empty icon={<BookOpen size={30} />} title="A fresh page">
            <p>Your practice sessions will appear here.</p>
            <Button variant="primary" onClick={onCreate}>
              Create your first test
            </Button>
          </Empty>
        </section>
      )}
    </div>
  );
}
