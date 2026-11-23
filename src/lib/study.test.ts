import { describe, expect, it } from "vitest";
import { assertBank, questionMap, questions } from "../data/bank";
import { errorHeadline, formatChoice } from "./format";
import { mulberry32 } from "./shuffle";
import {
  LETTERS,
  buildSession,
  confirmCurrent,
  earnsTiger,
  emptyStore,
  finishSession,
  isCorrect,
  move,
  selectOption,
  startSession,
  summarize,
} from "./study";
import { STORAGE_KEY, loadStore, saveStore } from "./storage";

describe("quaderno", () => {
  it("riserva la tigre alla simulazione con almeno l'80%", () => {
    expect(earnsTiger("simulation", 80)).toBe(true);
    expect(earnsTiger("simulation", 100)).toBe(true);
    expect(earnsTiger("simulation", 79)).toBe(false);
    expect(earnsTiger("practice", 100)).toBe(false);
    expect(earnsTiger("review", 80)).toBe(false);
  });

  it("ha 99 quesiti distinti, quattro opzioni e una sola risposta giusta", () => {
    assertBank(questions);
    expect(questions.map((question) => question.id)).toEqual(
      Array.from({ length: 99 }, (_, index) => index + 1),
    );
    expect(questions[0]?.options.find((option) => option.id === questions[0]?.correctOptionId)?.text).toContain(
      "strumenti aziendali",
    );
    expect(questions[64]?.options.find((option) => option.id === questions[64]?.correctOptionId)?.text).toBe(
      "Agli indigenti.",
    );
    expect(questions[98]?.options.find((option) => option.id === questions[98]?.correctOptionId)?.text).toBe(
      "Assicurazione volontaria, assicurazione sociale di malattia, Servizio sanitario nazionale.",
    );
  });

  it("corregge per ID anche se la risposta giusta cambia lettera", () => {
    const letters = new Set<string>();
    const session = buildSession(
      questions,
      [],
      { mode: "practice", count: 99, order: "random" },
      mulberry32(2026),
      "test",
    );
    let notFirst = 0;
    for (const question of questions) {
      for (let position = 0; position < 4; position += 1) {
        const others = question.options.map((option) => option.id).filter((id) => id !== question.correctOptionId);
        const order = [...others];
        order.splice(position, 0, question.correctOptionId);
        for (let index = 0; index < 4; index += 1) {
          expect(isCorrect(question, order[index])).toBe(index === position);
        }
      }
      const shuffled = session.optionOrder[String(question.id)];
      expect(shuffled).toHaveLength(4);
      const correctIndex = shuffled.indexOf(question.correctOptionId);
      expect(correctIndex).toBeGreaterThanOrEqual(0);
      letters.add(LETTERS[correctIndex] ?? "");
      if (correctIndex !== 0) notFirst += 1;
    }
    expect(notFirst).toBeGreaterThan(0);
    expect(letters).toEqual(new Set(["A", "B", "C", "D"]));
  });

  it("elenca gli errori con risposta scelta e risposta giusta, e tiene fuori le omesse", () => {
    let store = startSession(
      emptyStore(),
      { mode: "simulation", count: 10, order: "original" },
      mulberry32(7),
    );
    const session = store.active;
    if (!session) throw new Error("sessione assente");
    const first = session.questionIds[0];
    const second = session.questionIds[1];
    if (first === undefined || second === undefined) throw new Error("quesiti assenti");
    const question = questionMap.get(first);
    if (!question) throw new Error("quesito assente");
    const wrongId = session.optionOrder[String(first)]?.find((id) => id !== question.correctOptionId);
    if (!wrongId) throw new Error("distrattore assente");
    store = selectOption(store, wrongId);
    store = move(store, 1);
    store = finishSession(store);
    const result = store.lastResult;
    if (!result) throw new Error("risultato assente");
    const summary = summarize(result);
    expect(summary.wrong).toBe(1);
    expect(summary.errors).toHaveLength(1);
    expect(summary.omitted).toBe(9);
    expect(summary.errors[0]?.question.id).toBe(first);
    expect(summary.errors[0]?.selected?.id).toBe(wrongId);
    expect(summary.errors[0]?.correct.id).toBe(question.correctOptionId);
    expect(summary.errors[0]?.selected?.text).not.toBe(summary.errors[0]?.correct.text);
    expect(formatChoice(summary.errors[0]?.selected ?? null)).toMatch(/^[A-D]\. /);
    expect(formatChoice(summary.errors[0]?.correct ?? null)).toMatch(/^[A-D]\. /);
    expect(summary.items[1]?.status).toBe("omitted");
    expect(summary.items[1]?.selected).toBeNull();
    expect(formatChoice(null)).toBe("Nessuna risposta");
    expect(summary.errors.some((item) => item.status === "omitted")).toBe(false);
    expect(store.mistakes).toContain(first);
    expect(store.mistakes).not.toContain(second);
    expect(errorHeadline(summary.wrong)).toBe("Hai fatto 1 errore.");
    expect(errorHeadline(0)).toBe("Nessun errore.");
  });

  it("toglie dal ripasso la domanda risposta bene in una nuova sessione", () => {
    let store = startSession(emptyStore(), { mode: "practice", count: 10, order: "original" }, mulberry32(3));
    const questionId = store.active?.questionIds[0];
    if (questionId === undefined || !store.active) throw new Error("sessione assente");
    const question = questionMap.get(questionId);
    const wrongId = store.active.optionOrder[String(questionId)]?.find((id) => id !== question?.correctOptionId);
    if (!question || !wrongId) throw new Error("opzioni assenti");
    store = selectOption(store, wrongId);
    store = confirmCurrent(store);
    expect(store.mistakes).toEqual([questionId]);
    store = { ...store, active: null, view: { name: "home" } };
    store = startSession(store, { mode: "review", count: 99, order: "original" }, mulberry32(4));
    expect(store.active?.questionIds).toEqual([questionId]);
    store = selectOption(store, question.correctOptionId);
    store = confirmCurrent(store);
    expect(store.mistakes).not.toContain(questionId);
    expect(store.mastered).toContain(questionId);
  });

  it("ritrova dopo il salvataggio la stessa domanda e lo stesso ordine delle lettere", () => {
    const memory = new MemoryStorage();
    let store = startSession(emptyStore(), { mode: "practice", count: 20, order: "random" }, mulberry32(11));
    const questionId = store.active?.questionIds[0];
    const order = questionId === undefined ? undefined : store.active?.optionOrder[String(questionId)];
    const optionId = order?.[2];
    if (!questionId || !order || !optionId) throw new Error("ordine assente");
    store = selectOption(store, optionId);
    store = confirmCurrent(store);
    saveStore(store, memory);
    const loaded = loadStore(memory);
    expect(loaded.view.name).toBe("quiz");
    expect(loaded.active?.index).toBe(0);
    expect(loaded.active?.optionOrder[String(questionId)]).toEqual(order);
    expect(loaded.active?.selections[String(questionId)]).toBe(optionId);
    expect(loaded.active?.confirmed[String(questionId)]).toBe(true);
    memory.setItem(STORAGE_KEY, "{");
    expect(loadStore(memory).active).toBeNull();
  });
});

class MemoryStorage {
  private values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}
