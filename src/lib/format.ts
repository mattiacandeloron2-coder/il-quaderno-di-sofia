import type { Mode } from "./study";

export function modeLabel(mode: Mode): string {
  if (mode === "practice") return "Allenamento";
  if (mode === "simulation") return "Simulazione";
  return "Ripasso errori";
}

export function errorHeadline(count: number): string {
  if (count === 0) return "Nessun errore.";
  if (count === 1) return "Hai fatto 1 errore.";
  return `Hai fatto ${count} errori.`;
}

export function omissionHeadline(count: number): string {
  if (count === 0) return "";
  if (count === 1) return "Hai lasciato 1 quesito senza risposta.";
  return `Hai lasciato ${count} quesiti senza risposta.`;
}

export function piece(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function scoreSentence(summary: {
  correct: number;
  wrong: number;
  omitted: number;
  total: number;
  percent: number;
}): string {
  return `${piece(summary.correct, "corretta", "corrette")}, ${piece(summary.wrong, "errata", "errate")}, ${piece(summary.omitted, "omessa", "omesse")}. ${summary.percent}% sul totale di ${piece(summary.total, "quesito", "quesiti")}.`;
}

export function formatChoice(option: { letter: string; text: string } | null): string {
  if (!option) return "Nessuna risposta";
  return `${option.letter}. ${option.text}`;
}

export function orderHelp(count: number, order: "original" | "random"): string {
  if (count === 99 && order === "original") return "Tutti i 99 quesiti, nell’ordine del quaderno.";
  if (count === 99 && order === "random") return "Tutti i 99 quesiti, in ordine casuale.";
  if (order === "original") return `I primi ${count} quesiti, nell’ordine del quaderno.`;
  return `${count} quesiti estratti a caso.`;
}
