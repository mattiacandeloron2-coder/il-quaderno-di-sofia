import { questionMap } from "../data/bank";
import { emptyStore, type Mode, type Session, type Store, type View } from "./study";

export const STORAGE_KEY = "quaderno-sofia-v1";

function isMode(value: unknown): value is Mode {
  return value === "practice" || value === "simulation" || value === "review";
}

function isView(value: unknown): value is View {
  if (!value || typeof value !== "object") return false;
  const name = (value as { name?: unknown }).name;
  if (name === "setup") return isMode((value as { mode?: unknown }).mode);
  return name === "home" || name === "quiz" || name === "result" || name === "settings";
}

function idList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  const ids = value.filter((id): id is number => Number.isInteger(id) && questionMap.has(id));
  return [...new Set(ids)].sort((left, right) => left - right);
}

function sameIds(actual: string[], expected: string[]): boolean {
  return actual.length === expected.length && expected.every((id) => actual.includes(id));
}

function readSession(value: unknown): Session | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Partial<Session>;
  if (!isMode(raw.mode) || !Array.isArray(raw.questionIds) || raw.questionIds.length === 0) return null;
  if (!raw.questionIds.every((id) => Number.isInteger(id) && questionMap.has(id))) return null;
  const questionIds = raw.questionIds as number[];
  if (!raw.optionOrder || typeof raw.optionOrder !== "object") return null;
  const optionOrder: Record<string, string[]> = {};
  for (const questionId of questionIds) {
    const key = String(questionId);
    const order = (raw.optionOrder as Record<string, unknown>)[key];
    const question = questionMap.get(questionId);
    if (!question || !Array.isArray(order) || !order.every((id) => typeof id === "string")) return null;
    const ids = order as string[];
    if (new Set(ids).size !== 4) return null;
    if (!sameIds(ids, question.options.map((option) => option.id))) return null;
    optionOrder[key] = ids;
  }
  const selections: Record<string, string> = {};
  if (raw.selections && typeof raw.selections === "object") {
    for (const [key, selected] of Object.entries(raw.selections)) {
      if (typeof selected === "string" && optionOrder[key]?.includes(selected)) selections[key] = selected;
    }
  }
  const confirmed: Record<string, true> = {};
  if (raw.confirmed && typeof raw.confirmed === "object") {
    for (const [key, value] of Object.entries(raw.confirmed)) {
      if (value === true && selections[key]) confirmed[key] = true;
    }
  }
  const index = Number.isInteger(raw.index)
    ? Math.min(Math.max(raw.index as number, 0), questionIds.length - 1)
    : 0;
  return {
    id: typeof raw.id === "string" && raw.id ? raw.id : "sessione",
    mode: raw.mode,
    questionIds,
    optionOrder,
    selections,
    confirmed,
    index,
  };
}

export function sanitizeStore(value: unknown): Store {
  if (!value || typeof value !== "object") return emptyStore();
  const raw = value as Partial<Store>;
  if (raw.version !== 1) return emptyStore();
  const mistakes = idList(raw.mistakes);
  const mistakeSet = new Set(mistakes);
  const mastered = idList(raw.mastered).filter((id) => !mistakeSet.has(id));
  const active = readSession(raw.active);
  const lastResult = readSession(raw.lastResult);
  let view: View = isView(raw.view) ? raw.view : { name: "home" };
  if (view.name === "quiz" && !active) view = { name: "home" };
  if (view.name === "result" && !lastResult) view = { name: "home" };
  return { version: 1, active, lastResult, mastered, mistakes, view };
}

export function loadStore(storage: Pick<Storage, "getItem"> = globalThis.localStorage): Store {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return emptyStore();
    return sanitizeStore(JSON.parse(raw));
  } catch {
    return emptyStore();
  }
}

export function saveStore(
  store: Store,
  storage: Pick<Storage, "setItem"> = globalThis.localStorage,
): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(store));
}
