import { RAW_BANK } from "./raw";

export type Option = {
  id: string;
  text: string;
};

export type Question = {
  id: number;
  prompt: string;
  options: readonly Option[];
  correctOptionId: string;
};

function field(value: string, questionId: number, label: string): string {
  const text = value.trim();
  if (!text) throw new Error(`Quesito ${questionId}: campo vuoto (${label})`);
  return text;
}

/** Assegna correctOptionId prima di qualunque mescolamento. */
export function parseBank(raw: string): Question[] {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  return lines.map((line) => {
    const parts = line.split(" | ");
    if (parts.length !== 6) {
      throw new Error(`Attesi 6 campi, trovati ${parts.length}: ${line.slice(0, 80)}`);
    }
    const id = Number(parts[0].trim());
    if (!Number.isInteger(id)) throw new Error(`Numero non valido: ${parts[0]}`);
    const correctOptionId = `${id}:c`;
    const options: Option[] = [
      { id: correctOptionId, text: field(parts[2], id, "corretta") },
      { id: `${id}:d1`, text: field(parts[3], id, "distrattore 1") },
      { id: `${id}:d2`, text: field(parts[4], id, "distrattore 2") },
      { id: `${id}:d3`, text: field(parts[5], id, "distrattore 3") },
    ];
    return {
      id,
      prompt: field(parts[1], id, "domanda"),
      options,
      correctOptionId,
    };
  });
}

export function assertBank(items: readonly Question[]): void {
  if (items.length !== 99) {
    throw new Error(`Attesi 99 quesiti, trovati ${items.length}`);
  }
  const seen = new Set<number>();
  const optionIds = new Set<string>();
  for (let index = 0; index < items.length; index += 1) {
    const item = items[index];
    if (item.id !== index + 1) {
      throw new Error(`Numerazione interrotta: atteso ${index + 1}, trovato ${item.id}`);
    }
    if (seen.has(item.id)) throw new Error(`ID duplicato ${item.id}`);
    seen.add(item.id);
    if (item.options.length !== 4) throw new Error(`Quesito ${item.id}: servono 4 opzioni`);
    const texts = new Set(item.options.map((option) => option.text));
    if (texts.size !== 4) throw new Error(`Quesito ${item.id}: opzioni non distinte`);
    const ids = item.options.map((option) => option.id);
    if (new Set(ids).size !== 4) throw new Error(`Quesito ${item.id}: ID opzione duplicato`);
    if (!ids.includes(item.correctOptionId)) {
      throw new Error(`Quesito ${item.id}: correctOptionId assente`);
    }
    if (item.options.filter((option) => option.id === item.correctOptionId).length !== 1) {
      throw new Error(`Quesito ${item.id}: più di una risposta corretta`);
    }
    for (const option of item.options) optionIds.add(option.id);
  }
  if (optionIds.size !== 396) throw new Error(`ID opzione non univoci: ${optionIds.size}`);
}

export const questions: readonly Question[] = parseBank(RAW_BANK);
assertBank(questions);

export const questionMap: ReadonlyMap<number, Question> = new Map(
  questions.map((question) => [question.id, question]),
);
