import { questionMap } from "../data/bank";
import type { Question } from "../data/bank";
import { shuffle } from "./shuffle";

export const LETTERS = ["A", "B", "C", "D"] as const;

export type Mode = "practice" | "simulation" | "review";
export type OrderMode = "original" | "random";
export type CountChoice = 10 | 20 | 99;

export type Session = {
  id: string;
  mode: Mode;
  questionIds: number[];
  optionOrder: Record<string, string[]>;
  selections: Record<string, string>;
  confirmed: Record<string, true>;
  index: number;
};

export type View =
  | { name: "home" }
  | { name: "setup"; mode: Mode }
  | { name: "quiz" }
  | { name: "result" }
  | { name: "settings" };

export type Store = {
  version: 1;
  active: Session | null;
  lastResult: Session | null;
  mastered: number[];
  mistakes: number[];
  view: View;
};

export type StartRequest = {
  mode: Mode;
  count: CountChoice;
  order: OrderMode;
};

export type PresentedOption = {
  id: string;
  letter: string;
  text: string;
};

export type ItemStatus = "correct" | "wrong" | "omitted";

export type ItemResult = {
  position: number;
  total: number;
  question: Question;
  status: ItemStatus;
  selected: PresentedOption | null;
  correct: PresentedOption;
};

export type Summary = {
  items: ItemResult[];
  errors: ItemResult[];
  omissions: ItemResult[];
  correct: number;
  wrong: number;
  omitted: number;
  total: number;
  percent: number;
};

export function emptyStore(): Store {
  return {
    version: 1,
    active: null,
    lastResult: null,
    mastered: [],
    mistakes: [],
    view: { name: "home" },
  };
}

export function createId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `s-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function isCorrect(question: Question, selectedOptionId: string | null | undefined): boolean {
  return selectedOptionId === question.correctOptionId;
}

export function presentOptions(question: Question, order: readonly string[]): PresentedOption[] {
  return order.map((optionId, index) => {
    const option = question.options.find((item) => item.id === optionId);
    if (!option) throw new Error(`Opzione ${optionId} assente nel quesito ${question.id}`);
    const letter = LETTERS[index];
    if (!letter) throw new Error(`Lettera assente per l’opzione ${optionId}`);
    return { id: option.id, letter, text: option.text };
  });
}

export function buildSession(
  bank: readonly Question[],
  mistakeIds: readonly number[],
  start: StartRequest,
  random: () => number = Math.random,
  id: string = createId(),
): Session {
  let questionIds: number[];
  if (start.mode === "review") {
    questionIds = [...mistakeIds].sort((a, b) => a - b);
  } else {
    const ordered = [...bank].sort((a, b) => a.id - b.id).map((question) => question.id);
    const pool = start.order === "random" ? shuffle(ordered, random) : ordered;
    questionIds = pool.slice(0, start.count);
  }
  if (questionIds.length === 0) throw new Error("Nessun quesito nella sessione");

  const optionOrder: Record<string, string[]> = {};
  for (const questionId of questionIds) {
    const question = questionMap.get(questionId);
    if (!question) throw new Error(`Quesito ${questionId} assente`);
    optionOrder[String(questionId)] = shuffle(
      question.options.map((option) => option.id),
      random,
    );
  }

  return {
    id,
    mode: start.mode,
    questionIds,
    optionOrder,
    selections: {},
    confirmed: {},
    index: 0,
  };
}

export function startSession(
  store: Store,
  start: StartRequest,
  random: () => number = Math.random,
): Store {
  if (start.mode === "review" && store.mistakes.length === 0) return store;
  const bank = [...questionMap.values()];
  const active = buildSession(bank, store.mistakes, start, random);
  return { ...store, active, view: { name: "quiz" } };
}

function applyOutcome(store: Store, questionId: number, correct: boolean): Store {
  const mastered = store.mastered.filter((id) => id !== questionId);
  const mistakes = store.mistakes.filter((id) => id !== questionId);
  if (correct) mastered.push(questionId);
  else mistakes.push(questionId);
  mastered.sort((a, b) => a - b);
  mistakes.sort((a, b) => a - b);
  return { ...store, mastered, mistakes };
}

export function selectOption(store: Store, optionId: string): Store {
  const session = store.active;
  if (!session) return store;
  const questionId = session.questionIds[session.index];
  if (questionId === undefined) return store;
  const key = String(questionId);
  if (session.mode !== "simulation" && session.confirmed[key]) return store;
  if (!session.optionOrder[key]?.includes(optionId)) return store;
  return {
    ...store,
    active: {
      ...session,
      selections: { ...session.selections, [key]: optionId },
    },
  };
}

export function confirmCurrent(store: Store): Store {
  const session = store.active;
  if (!session || session.mode === "simulation") return store;
  const questionId = session.questionIds[session.index];
  if (questionId === undefined) return store;
  const key = String(questionId);
  if (session.confirmed[key]) return store;
  const selected = session.selections[key];
  if (!selected) return store;
  const question = questionMap.get(questionId);
  if (!question) return store;
  const next: Store = {
    ...store,
    active: {
      ...session,
      confirmed: { ...session.confirmed, [key]: true },
    },
  };
  return applyOutcome(next, questionId, isCorrect(question, selected));
}

export function move(store: Store, delta: number): Store {
  const session = store.active;
  if (!session) return store;
  const nextIndex = session.index + delta;
  if (nextIndex < 0 || nextIndex >= session.questionIds.length) return store;
  if (session.mode !== "simulation" && delta > 0) {
    const key = String(session.questionIds[session.index]);
    if (!session.confirmed[key]) return store;
  }
  if (session.mode !== "simulation" && delta < 0) return store;
  return { ...store, active: { ...session, index: nextIndex } };
}

export function countMissing(session: Session): number {
  return session.questionIds.filter((id) => !session.selections[String(id)]).length;
}

export function finishSession(store: Store): Store {
  const session = store.active;
  if (!session) return store;
  let next = store;
  if (session.mode === "simulation") {
    for (const questionId of session.questionIds) {
      const selected = session.selections[String(questionId)];
      if (!selected) continue;
      const question = questionMap.get(questionId);
      if (!question) continue;
      next = applyOutcome(next, questionId, isCorrect(question, selected));
    }
  }
  return {
    ...next,
    active: null,
    lastResult: session,
    view: { name: "result" },
  };
}

export function summarize(session: Session): Summary {
  const total = session.questionIds.length;
  const items: ItemResult[] = session.questionIds.map((questionId, index) => {
    const question = questionMap.get(questionId);
    if (!question) throw new Error(`Quesito ${questionId} assente`);
    const order = session.optionOrder[String(questionId)];
    if (!order) throw new Error(`Ordine assente per il quesito ${questionId}`);
    const options = presentOptions(question, order);
    const selected = options.find((option) => option.id === session.selections[String(questionId)]) ?? null;
    const correct = options.find((option) => option.id === question.correctOptionId);
    if (!correct) throw new Error(`Risposta giusta assente nel quesito ${questionId}`);
    const status: ItemStatus = !selected ? "omitted" : selected.id === question.correctOptionId ? "correct" : "wrong";
    return { position: index + 1, total, question, status, selected, correct };
  });
  const correct = items.filter((item) => item.status === "correct").length;
  const wrong = items.filter((item) => item.status === "wrong").length;
  const omitted = items.filter((item) => item.status === "omitted").length;
  return {
    items,
    errors: items.filter((item) => item.status === "wrong"),
    omissions: items.filter((item) => item.status === "omitted"),
    correct,
    wrong,
    omitted,
    total,
    percent: total === 0 ? 0 : Math.round((correct / total) * 100),
  };
}

export function earnsTiger(mode: Mode, percent: number): boolean {
  return mode === "simulation" && percent >= 80;
}

export function progressOf(store: Store): { faced: number; correct: number; mistakes: number; total: number } {
  return {
    faced: new Set([...store.mastered, ...store.mistakes]).size,
    correct: store.mastered.length,
    mistakes: store.mistakes.length,
    total: questionMap.size,
  };
}
