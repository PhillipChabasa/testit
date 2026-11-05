import {
  ArrowRight,
  BookOpen,
  FileJson,
  Layers3,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Badge, Button, Empty } from "../components/ui";
import { list } from "../domain/engine";
import type { Bank } from "../domain/types";
export function Library({
  banks,
  onImport,
  onSample,
  onPractice,
  onCreate,
}: {
  banks: Bank[];
  onImport: () => void;
  onSample: () => void;
  onPractice: () => void;
  onCreate: () => void;
}) {
  const [search, setSearch] = useState("");
  const shown = banks.filter((b) =>
    `${b.data.quiz.title} ${list(b.data.quiz.subject).join(" ")}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  return (
    <div className="page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">A GROWING BODY OF KNOWLEDGE</div>
          <h1>
            Your question library<span className="violet">.</span>
          </h1>
          <p>Your imported banks, together in one thoughtful space.</p>
        </div>
        <Button variant="primary" onClick={onImport}>
          <Plus size={17} />
          Import JSON
        </Button>
      </div>
      <div className="authoring-entry">
        <span className="action-icon lavender">
          <Sparkles size={22} />
        </span>
        <div>
          <strong>Turn your study brief into a question bank.</strong>
          <p>Set your specifications and copy a ready-to-use AI prompt.</p>
        </div>
        <Button onClick={onCreate}>
          Create questions with AI
          <ArrowRight size={16} />
        </Button>
      </div>
      <div className="library-toolbar">
        <label className="search-box">
          <Search size={18} />
          <input
            aria-label="Search question banks"
            placeholder="Find a question bank…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>
        <span>{banks.length} saved banks</span>
      </div>
      {shown.length ? (
        <div className="library-grid">
          {shown.map((b, i) => (
            <article className="surface library-card" key={b.key}>
              <div className={`library-cover cover-${i % 4}`}>
                <div className="library-cover-shape" />
                <BookOpen size={38} />
                <Badge>QUESTION BANK</Badge>
              </div>
              <div className="library-card-content">
                <span className="eyebrow">
                  {list(b.data.quiz.subject).join(" · ")}
                </span>
                <h2>{b.data.quiz.title || "Untitled bank"}</h2>
                <div className="library-card-meta">
                  <span>
                    <FileJson size={15} />
                    {b.data.quiz.questions.length} questions
                  </span>
                  <span>
                    <Layers3 size={15} />
                    {
                      b.data.quiz.questions.filter((q) => q.concept_card).length
                    }{" "}
                    concepts
                  </span>
                </div>
                <div className="library-tags">
                  {[
                    ...new Set(
                      b.data.quiz.questions.flatMap((q) =>
                        list(q.system ?? b.data.quiz.system),
                      ),
                    ),
                  ]
                    .slice(0, 3)
                    .map((s) => (
                      <Badge key={s}>{s}</Badge>
                    ))}
                </div>
                <div className="library-card-bottom">
                  <span>Imported · Unreviewed</span>
                  <Button variant="ghost" onClick={onPractice}>
                    Practice
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <section className="surface">
          <Empty
            icon={<BookOpen size={30} />}
            title={
              search ? "No matching banks" : "Make room for your next question"
            }
          >
            <p>
              Import your existing TESTIT JSON, or explore an original sample
              bank.
            </p>
            <div className="button-row">
              <Button variant="primary" onClick={onImport}>
                Import JSON
              </Button>
              <Button onClick={onSample}>Add sample bank</Button>
            </div>
          </Empty>
        </section>
      )}
      <div className="import-note">
        <FileJson size={20} />
        <div>
          <strong>Your format, preserved.</strong>
          <p>
            Existing question JSON, metadata, explanations and concept cards
            remain compatible. Original banks and practice progress stay intact.
          </p>
        </div>
      </div>
    </div>
  );
}
