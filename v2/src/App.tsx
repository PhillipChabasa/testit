import {
  Component,
  Suspense,
  lazy,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useAppUpdate } from "./useAppUpdate";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { AlertCircle, Check, FileJson, Upload, X } from "lucide-react";
import { Shell } from "./components/Shell";
import type { Page } from "./components/Shell";
import { Button, Modal } from "./components/ui";
import { Dashboard } from "./features/Dashboard";
import {
  clone,
  complete,
  createAttempt,
  eligible,
  tick,
} from "./domain/engine";
import { cards, nextSchedule } from "./domain/revision";
import { sample } from "./domain/sample";
import {
  buildBackup,
  download,
  emptyStore,
  importQuiz,
  readBanks,
  readStore,
  saveAttempt,
  touch,
} from "./repositories/storage";
import type {
  Attempt,
  CardEntry,
  Concept,
  Schedule,
  Store,
  TestConfig,
} from "./domain/types";
const Library = lazy(() =>
  import("./features/Library").then((m) => ({ default: m.Library })),
);
const PromptBuilder = lazy(() =>
  import("./features/PromptBuilder").then((m) => ({
    default: m.PromptBuilder,
  })),
);
const TestBuilder = lazy(() =>
  import("./features/TestBuilder").then((m) => ({ default: m.TestBuilder })),
);
const Workspace = lazy(() =>
  import("./features/Workspace").then((m) => ({ default: m.Workspace })),
);
const Revision = lazy(() =>
  import("./features/Revision").then((m) => ({ default: m.Revision })),
);
const History = lazy(() =>
  import("./features/History").then((m) => ({ default: m.History })),
);
const Settings = lazy(() =>
  import("./features/Settings").then((m) => ({ default: m.Settings })),
);
const pages: Page[] = [
  "dashboard",
  "library",
  "authoring",
  "builder",
  "revision",
  "history",
  "settings",
];
function currentPage(): Page {
  const hash = location.hash.slice(1) as Page;
  if (pages.includes(hash)) return hash;
  const legacyView = new URLSearchParams(location.search).get("view") || "";
  return (
    (
      {
        home: "dashboard",
        library: "library",
        qbank: "builder",
        quiz: "builder",
        revision: "revision",
        prompt: "authoring",
        results: "history",
        settings: "settings",
      } as Record<string, Page>
    )[legacyView] || "dashboard"
  );
}
export default function App() {
  const update = useAppUpdate();
  const [page, setPage] = useState<Page>(currentPage),
    [bankData, setBanks] = useState(readBanks),
    [store, setStore] = useState<Store>(emptyStore),
    [storageError, setStorageError] = useState(""),
    [toast, setToast] = useState(""),
    [importOpen, setImportOpen] = useState(false),
    [json, setJson] = useState(""),
    [importError, setImportError] = useState(""),
    [dark, setDark] = useState(
      () => localStorage.getItem("testit_theme") === "dark",
    ),
    [schedules, setSchedules] = useState<Record<string, Schedule>>({}),
    [attempt, setAttempt] = useState<Attempt | null>(null),
    [saveError, setSaveError] = useState("");
  const active = useRef<Attempt | null>(null),
    file = useRef<HTMLInputElement>(null),
    lastPersist = useRef(0),
    lease = useRef<string | null>(null),
    tabId = useRef(crypto.randomUUID()),
    dirty = useRef(false);
  const notify = useCallback((s: string) => setToast(s), []);
  const refresh = useCallback(() => {
    setBanks(readBanks());
    try {
      setStore(readStore());
      setStorageError("");
    } catch (e) {
      setStorageError((e as Error).message);
    }
    try {
      const s = JSON.parse(localStorage.getItem("testit_revision_v1") || "{}");
      if (!s || typeof s !== "object" || Array.isArray(s)) throw Error();
      setSchedules(s);
    } catch {
      setStorageError(
        "Revision data could not be read. Original records are retained; export a recovery backup.",
      );
    }
  }, []);
  useEffect(refresh, [refresh]);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
  }, [dark]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 6000);
    return () => clearTimeout(t);
  }, [toast]);
  const persist = useCallback((a: Attempt) => {
    try {
      const s = saveAttempt(a);
      setStore(s);
      setSaveError("");
      dirty.current = false;
      lastPersist.current = Date.now();
      return true;
    } catch (e) {
      dirty.current = true;
      setSaveError(`Could not save: ${(e as Error).message}`);
      return false;
    }
  }, []);
  function release() {
    if (lease.current) {
      try {
        const owner = JSON.parse(localStorage.getItem(lease.current) || "null");
        if (owner?.tab === tabId.current)
          localStorage.removeItem(lease.current);
      } catch {
        /* Lease expires automatically. */
      }
      lease.current = null;
    }
  }
  function claim(a: Attempt) {
    const key = "testit_v2_lease_" + a.id;
    let old;
    try {
      old = JSON.parse(localStorage.getItem(key) || "null");
    } catch {
      /* Replace invalid lease. */
    }
    if (old?.tab !== tabId.current && old?.expires > Date.now())
      throw Error(
        "This session is open in another TESTIT 2.0 tab. Suspend it there first.",
      );
    localStorage.setItem(
      key,
      JSON.stringify({ tab: tabId.current, expires: Date.now() + 20000 }),
    );
    lease.current = key;
  }
  const change = useCallback(
    (fn: (a: Attempt) => void) => {
      const value = active.current;
      if (!value) return;
      const next = clone(value);
      tick(next);
      if (value.status !== "active" || next.status !== "completed") fn(next);
      active.current = next;
      persist(next);
      setAttempt(clone(next));
    },
    [persist],
  );
  const suspend = useCallback(() => {
    const value = active.current;
    let saved = !dirty.current;
    if (value && (value.status === "active" || dirty.current)) {
      const next = clone(value);
      tick(next);
      if (next.status === "active") {
        next.status = "suspended";
        next.runningSince = null;
      }
      active.current = next;
      saved = persist(next);
      setAttempt(clone(next));
    }
    release();
    return saved;
  }, [persist]);
  useEffect(() => {
    const id = setInterval(() => {
      const a = active.current;
      if (!a || a.status !== "active") return;
      const next = clone(a);
      tick(next);
      active.current = next;
      if (
        next.status === "completed" ||
        Date.now() - lastPersist.current >= 5000
      )
        persist(next);
      if (lease.current)
        try {
          localStorage.setItem(
            lease.current,
            JSON.stringify({ tab: tabId.current, expires: Date.now() + 20000 }),
          );
        } catch {
          /* Save failure shown by persistence. */
        }
      setAttempt(clone(next));
    }, 1000);
    return () => clearInterval(id);
  }, [persist]);
  useEffect(() => {
    const hide = () => {
        suspend();
      },
      unload = (e: BeforeUnloadEvent) => {
        suspend();
        if (dirty.current) {
          e.preventDefault();
          e.returnValue = "";
        }
      },
      storage = (e: StorageEvent) => {
        if (e.key === "testit_qbank_v1") {
          if (active.current && suspend()) {
            active.current = null;
            setAttempt(null);
            notify(
              "Session suspended because test data changed in another tab. Reopen it to continue.",
            );
          }
          refresh();
        } else if (
          e.key?.startsWith("testit_quiz_") ||
          e.key === "testit_revision_v1"
        )
          refresh();
      },
      hash = () => {
        if (!pages.includes(location.hash.slice(1) as Page)) return;
        if (active.current && !suspend()) {
          notify("Save or export your recovery data before leaving.");
          return;
        }
        active.current = null;
        setAttempt(null);
        setPage(currentPage());
      };
    window.addEventListener("pagehide", hide);
    window.addEventListener("beforeunload", unload);
    window.addEventListener("storage", storage);
    window.addEventListener("hashchange", hash);
    return () => {
      window.removeEventListener("pagehide", hide);
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("storage", storage);
      window.removeEventListener("hashchange", hash);
    };
  }, [refresh, suspend, notify]);
  function navigate(p: Page) {
    if (active.current && !suspend()) {
      notify("Save or export your recovery data before leaving.");
      return;
    }
    active.current = null;
    setAttempt(null);
    setPage(p);
    location.hash = p;
    refresh();
    window.scrollTo(0, 0);
  }
  function open(a: Attempt) {
    try {
      refresh();
      const fresh = readStore().attempts[a.id] || a;
      const next = clone(fresh);
      if (next.status !== "completed") {
        claim(next);
        if (next.status === "active") tick(next);
        if (!(next as Attempt).completedAt) {
          next.status = "active";
          next.runningSince = Date.now();
        }
      }
      active.current = next;
      persist(next);
      setAttempt(clone(next));
    } catch (e) {
      notify((e as Error).message);
    }
  }
  function start(c: TestConfig) {
    if (storageError) {
      notify(storageError);
      return;
    }
    try {
      const a = createAttempt(eligible(bankData.banks, store.attempts, c), c);
      claim(a);
      active.current = a;
      persist(a);
      setAttempt(clone(a));
      window.scrollTo(0, 0);
    } catch (e) {
      notify((e as Error).message);
    }
  }
  function finish() {
    change((a) => complete(a));
    release();
  }
  function closeSession() {
    if (!suspend()) {
      notify("Export recovery or retry saving before leaving this session.");
      return;
    }
    release();
    active.current = null;
    setAttempt(null);
    navigate("history");
  }
  function addSample() {
    try {
      importQuiz(JSON.stringify(sample));
      refresh();
      notify(
        "Original sample bank added. It is educational, unreviewed content.",
      );
    } catch (e) {
      notify((e as Error).message);
    }
  }
  function doImport() {
    try {
      importQuiz(json);
      refresh();
      setImportOpen(false);
      setJson("");
      setImportError("");
      notify(
        "Question bank imported. Existing banks and progress are preserved.",
      );
      navigate("library");
    } catch (e) {
      setImportError((e as Error).message);
    }
  }
  function rate(entry: CardEntry, r: number) {
    try {
      const fresh = JSON.parse(
        localStorage.getItem("testit_revision_v1") || "{}",
      );
      fresh[entry.key] = nextSchedule(r, fresh[entry.key]);
      localStorage.setItem("testit_revision_v1", JSON.stringify(fresh));
      touch();
      setSchedules(fresh);
      return true;
    } catch (e) {
      notify(`Could not save this rating: ${(e as Error).message}`);
      return false;
    }
  }
  function edit(entry: CardEntry, concept: Concept) {
    try {
      const raw = localStorage.getItem(entry.slot);
      if (!raw) throw Error("The original bank could not be found.");
      const data = JSON.parse(raw);
      const q = data.quiz.questions.find(
        (q: { id: string | number }) => String(q.id) === String(entry.id),
      );
      if (!q) throw Error("Question no longer exists.");
      q.concept_card = concept;
      data.savedAt = Date.now();
      localStorage.setItem(entry.slot, JSON.stringify(data));
      touch();
      refresh();
      notify(
        "Concept updated. Its new content starts a fresh revision schedule.",
      );
      return true;
    } catch (e) {
      notify((e as Error).message);
      return false;
    }
  }
  const entries = cards(bankData.banks, store.attempts, schedules),
    attempts = Object.values(store.attempts).sort(
      (a, b) => b.savedAt - a.savedAt,
    );
  return (
    <MotionConfig reducedMotion="user">
      {update.waiting && (
        <div className="update-banner" role="status">
          <span>
            A TESTIT update is ready. Save and reload when you’re ready.
          </span>
          <Button
            onClick={() => {
              if (suspend()) update.activate();
              else
                notify(
                  "Your session could not be saved. Export recovery before updating.",
                );
            }}
          >
            Save & reload
          </Button>
        </div>
      )}
      <Suspense
        fallback={
          <div className="app-loading" role="status">
            <span>✳</span>Preparing your workspace…
          </div>
        }
      >
        {attempt ? (
          <>
            <Workspace
              attempt={attempt}
              onChange={change}
              onSuspend={closeSession}
              onFinish={finish}
              onExit={closeSession}
              saveError={saveError}
            />
            {saveError && (
              <div className="recovery-toolbar">
                <Button
                  onClick={() => {
                    if (active.current) {
                      persist(active.current);
                      setAttempt(clone(active.current));
                    }
                  }}
                >
                  Retry saving
                </Button>
                <Button
                  variant="primary"
                  onClick={() =>
                    download(
                      "testit-recovery.json",
                      JSON.stringify(buildBackup(active.current), null, 2),
                      "application/json",
                    )
                  }
                >
                  Export recovery
                </Button>
              </div>
            )}
          </>
        ) : (
          <Shell
            page={page}
            onNavigate={navigate}
            dark={dark}
            onTheme={() => {
              try {
                localStorage.setItem("testit_theme", dark ? "light" : "dark");
                setDark(!dark);
              } catch (e) {
                notify((e as Error).message);
              }
            }}
          >
            {(storageError || bankData.warnings.length > 0) && (
              <div className="data-warning" role="alert">
                <AlertCircle size={19} />
                <span>
                  {storageError ||
                    `${bankData.warnings.length} malformed bank records retained for recovery. Export a backup before repairing them.`}
                </span>
                <Button
                  onClick={() =>
                    download(
                      "testit-recovery.json",
                      JSON.stringify(buildBackup(), null, 2),
                      "application/json",
                    )
                  }
                >
                  Export recovery
                </Button>
              </div>
            )}
            <AnimatePresence mode="wait">
              <motion.div
                key={page}
                initial={{ opacity: 0, y: 7 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.16 }}
              >
                {page === "dashboard" ? (
                  <Dashboard
                    banks={bankData.banks}
                    attempts={attempts}
                    cards={entries}
                    onNavigate={navigate}
                    onOpen={open}
                    onImport={() => setImportOpen(true)}
                    onSample={addSample}
                  />
                ) : page === "library" ? (
                  <Library
                    banks={bankData.banks}
                    onImport={() => setImportOpen(true)}
                    onSample={addSample}
                    onPractice={() => navigate("builder")}
                    onCreate={() => navigate("authoring")}
                  />
                ) : page === "authoring" ? (
                  <PromptBuilder
                    onImported={refresh}
                    onPractice={() => navigate("builder")}
                    onNotify={notify}
                  />
                ) : page === "builder" ? (
                  <TestBuilder
                    banks={bankData.banks}
                    store={store}
                    onStart={start}
                    onImport={() => setImportOpen(true)}
                    onCreate={() => navigate("authoring")}
                  />
                ) : page === "revision" ? (
                  <Revision
                    entries={entries}
                    banks={bankData.banks}
                    onRate={rate}
                    onEdit={edit}
                    onError={notify}
                  />
                ) : page === "history" ? (
                  <History
                    attempts={attempts}
                    onOpen={open}
                    onCreate={() => navigate("builder")}
                  />
                ) : (
                  <Settings onRefresh={refresh} onError={notify} />
                )}
              </motion.div>
            </AnimatePresence>
          </Shell>
        )}
        <Modal
          open={importOpen}
          onOpenChange={setImportOpen}
          title="Bring your questions along"
          description="Import your existing TESTIT JSON. Banks, concept cards and metadata are preserved."
        >
          <label className="upload-area">
            <Upload size={23} />
            <strong>Choose a JSON file</strong>
            <span>or paste your AI response below</span>
            <input
              ref={file}
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f)
                  try {
                    setJson(await f.text());
                    setImportError("");
                  } catch (err) {
                    setImportError((err as Error).message);
                  }
                e.target.value = "";
              }}
            />
          </label>
          <label className="field">
            Quiz JSON
            <textarea
              className="json-input"
              aria-label="Quiz JSON"
              placeholder={'{ "title": "My bank", "questions": [...] }'}
              value={json}
              onChange={(e) => {
                setJson(e.target.value);
                setImportError("");
              }}
            />
          </label>
          {importError && (
            <p role="alert" className="form-error">
              <AlertCircle size={16} />
              {importError}
            </p>
          )}
          <div className="import-help">
            <FileJson size={16} />
            <span>
              Existing IDs and answer keys stay intact. Identical imports reuse
              their saved bank.
            </span>
          </div>
          <div className="dialog-actions">
            <Button
              onClick={() => {
                addSample();
                setImportOpen(false);
              }}
            >
              Try sample bank
            </Button>
            <Button
              variant="primary"
              onClick={doImport}
              disabled={!json.trim()}
            >
              Import question bank
              <Check size={16} />
            </Button>
          </div>
        </Modal>
        <AnimatePresence>
          {toast && (
            <motion.div
              role="status"
              className="toast"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span>{toast}</span>
              <button
                aria-label="Dismiss notification"
                onClick={() => setToast("")}
              >
                <X size={17} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </Suspense>
    </MotionConfig>
  );
}
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: string }
> {
  state = { error: "" };
  static getDerivedStateFromError(e: Error) {
    return { error: e.message };
  }
  render() {
    if (this.state.error)
      return (
        <div className="fatal-error">
          <h1>Your data is still here.</h1>
          <p>The application encountered an error: {this.state.error}</p>
          <Button onClick={() => location.reload()}>Reload application</Button>
          <a href="./legacy/index.html">Open original TESTIT</a>
        </div>
      );
    return this.props.children;
  }
}
