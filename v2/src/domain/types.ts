export interface Concept {
  question: string;
  answer: string;
  explanation: string;
}
export interface Question {
  id: string | number;
  question: string;
  options: Record<string, string>;
  correct_answer: string;
  explanation?: string;
  option_explanations?: Record<string, string>;
  concept_card?: Concept;
  subject?: string | string[];
  system?: string | string[];
  tags?: string[];
  [key: string]: unknown;
}
export interface Quiz {
  title: string;
  questions: Question[];
  subject?: string | string[];
  system?: string | string[];
  [key: string]: unknown;
}
export interface Bank {
  key: string;
  data: {
    quiz: Quiz;
    answers?: Record<string, string>;
    flags?: (string | number)[];
    savedAt?: number;
    [key: string]: unknown;
  };
}
export interface Item {
  key: string;
  bank: string;
  bankTitle: string;
  question: Question;
  order: string[];
}
export interface Attempt {
  version: 1;
  id: string;
  revision: string;
  parentRevision: string | null;
  name: string;
  mode: "tutor" | "exam";
  timed: boolean;
  durationMs: number;
  elapsedMs: number;
  runningSince: number | null;
  status: "active" | "suspended" | "completed";
  items: Item[];
  index: number;
  answers: Record<string, string>;
  flags: string[];
  submitted: string[];
  responseAt: Record<string, number>;
  highlights: Record<string, [number, number][]>;
  eliminated?: Record<string, string[]>;
  questionMs: Record<string, number>;
  createdAt: number;
  savedAt: number;
  completedAt?: number;
}
export interface Store {
  version: 1;
  attempts: Record<string, Attempt>;
}
export interface TestConfig {
  banks: string[];
  subjects: string[];
  systems: string[];
  pool: string;
  count: number;
  mode: "tutor" | "exam";
  timed: boolean;
  minutes: number;
  name: string;
}
export interface Schedule {
  due: number;
  interval: number;
  reviews: number;
  lastReviewed: number;
  rating: number;
}
export interface CardEntry {
  key: string;
  slot: string;
  id: string | number;
  title: string;
  card: Concept;
  tags: string[];
  schedule?: Schedule;
  wrong: boolean;
  flagged: boolean;
}
export interface Backup {
  version: number;
  lastModified: number;
  studyProgress: Record<string, Bank["data"]>;
  customData: Record<string, unknown>;
  settings: { theme?: string };
  recoveryRaw?: Record<string, string>;
  statistics?: unknown;
  bookmarks?: unknown;
}
