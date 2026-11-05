import {
  BookOpen,
  LayoutDashboard,
  Layers3,
  Library,
  Settings2,
  Sparkles,
  ArrowUpRight,
  Menu,
  X,
  Moon,
  Sun,
  PanelLeftClose,
  GraduationCap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Button } from "./ui";
export type Page =
  | "dashboard"
  | "library"
  | "authoring"
  | "builder"
  | "revision"
  | "history"
  | "settings";
const nav = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "library", label: "Question library", icon: Library },
  { id: "authoring", label: "Create questions with AI", icon: Sparkles },
  { id: "builder", label: "Create a test", icon: BookOpen },
  { id: "revision", label: "Concept revision", icon: Layers3 },
  { id: "history", label: "Your sessions", icon: GraduationCap },
  { id: "settings", label: "Settings & data", icon: Settings2 },
] as const;
export function Shell({
  page,
  onNavigate,
  children,
  dark,
  onTheme,
}: {
  page: Page;
  onNavigate: (p: Page) => void;
  children: ReactNode;
  dark: boolean;
  onTheme: () => void;
}) {
  const [open, setOpen] = useState(false);
  const sidebar = useRef<HTMLElement>(null);
  const opener = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const focusable = () =>
      Array.from(
        sidebar.current?.querySelectorAll<HTMLElement>("button,a[href]") || [],
      ).filter((el) => el.getClientRects().length > 0);
    focusable()[0]?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        opener.current?.focus();
      }
      if (e.key !== "Tab") return;
      const nodes = focusable(),
        first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main")?.focus();
        }}
      >
        Skip to content
      </a>
      <div className="mobile-bar">
        <a className="brand" href="#dashboard">
          testit<span>✳</span>
        </a>
        <button
          ref={opener}
          className="button ghost"
          aria-label="Open navigation"
          aria-expanded={open}
          aria-controls="workspace-navigation"
          onClick={() => setOpen(true)}
        >
          <Menu />
        </button>
      </div>
      {open && (
        <button
          className="sidebar-scrim"
          aria-label="Close navigation"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        id="workspace-navigation"
        ref={sidebar}
        role={open ? "dialog" : undefined}
        aria-modal={open ? true : undefined}
        aria-label="Workspace navigation"
        className={`sidebar ${open ? "open" : ""}`}
      >
        <div className="brand-row">
          <a className="brand" href="#dashboard">
            testit<span>✳</span>
          </a>
          <Button
            className="mobile-close"
            variant="ghost"
            aria-label="Close navigation"
            onClick={() => setOpen(false)}
          >
            <X size={20} />
          </Button>
        </div>
        <div className="workspace-label">
          <span className="avatar tiny">T</span>
          <div>
            Personal workspace<small>Clinical learning</small>
          </div>
          <PanelLeftClose size={15} />
        </div>
        <div className="nav-caption">YOUR WORKSPACE</div>
        <nav>
          {nav.map((n) => (
            <button
              key={n.id}
              aria-label={n.label}
              className={`nav-item ${page === n.id ? "active" : ""}`}
              onClick={() => {
                onNavigate(n.id);
                setOpen(false);
              }}
            >
              <n.icon size={19} />
              <span>{n.label}</span>
              {n.id === "builder" && <span className="nav-plus">+</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-note">
          <Sparkles size={20} />
          <p>
            A little progress.
            <br />
            <strong>A stronger clinician.</strong>
          </p>
          <span>Make space for what matters.</span>
        </div>
        <div className="sidebar-bottom">
          <a href="./legacy/index.html" target="_blank" rel="noreferrer">
            Original TESTIT <ArrowUpRight size={15} />
          </a>
          <button onClick={onTheme}>
            {dark ? <Sun size={17} /> : <Moon size={17} />}{" "}
            {dark ? "Light appearance" : "Dark appearance"}
          </button>
          <div className="profile">
            <span className="avatar">You</span>
            <div>
              Your learning journey<small>South African MBChB</small>
            </div>
          </div>
        </div>
      </aside>
      <div className="main-wrap" inert={open}>
        <header className="topbar">
          <span>YOUR SPACE TO UNDERSTAND</span>
          <div>
            <span className="live-dot" />
            Local-first learning
            <span className="topbar-divider" />
            MBChB · Final year
          </div>
        </header>
        <main id="main" tabIndex={-1}>
          {children}
        </main>
        <footer className="app-footer">
          <span>Thoughtful practice. Lasting understanding.</span>
          <span>TESTIT 2.0</span>
        </footer>
      </div>
    </div>
  );
}
