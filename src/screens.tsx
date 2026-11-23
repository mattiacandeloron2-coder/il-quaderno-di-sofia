import { useEffect, useRef, useState, type ReactNode } from "react";
import tigerGif from "./assets/tigre.gif";
import type { CountChoice, Mode, OrderMode, PresentedOption, Session, StartRequest, Store } from "./lib/study";
import { countMissing, earnsTiger, presentOptions, progressOf, summarize } from "./lib/study";
import { questionMap } from "./data/bank";
import {
  errorHeadline,
  formatChoice,
  modeLabel,
  omissionHeadline,
  orderHelp,
  piece,
  scoreSentence,
} from "./lib/format";

export function Masthead({
  atHome,
  showSettings,
  onHome,
  onSettings,
}: {
  atHome: boolean;
  showSettings: boolean;
  onHome: () => void;
  onSettings: () => void;
}) {
  return (
    <header className="masthead">
      {atHome ? (
        <p className="masthead-name">Il quaderno di Sofia</p>
      ) : (
        <button type="button" className="masthead-name masthead-button" onClick={onHome}>
          Il quaderno di Sofia
        </button>
      )}
      {showSettings ? (
        <button type="button" className="text-button" onClick={onSettings}>
          Impostazioni
        </button>
      ) : null}
    </header>
  );
}

function AnswerPair({ selected, correct }: { selected: PresentedOption | null; correct: PresentedOption }) {
  return (
    <div className="answer-pair">
      <div className="answer-chosen">
        <span className="label">Risposta scelta</span>
        <p>{formatChoice(selected)}</p>
      </div>
      <div className="answer-right-wrap">
        <span className="label">Risposta giusta</span>
        <p className="answer-right">{formatChoice(correct)}</p>
      </div>
    </div>
  );
}

export function HomeScreen({
  store,
  onResume,
  onStart,
  onSetup,
  onReview,
  onResult,
}: {
  store: Store;
  onResume: () => void;
  onStart: () => void;
  onSetup: (mode: Mode) => void;
  onReview: () => void;
  onResult: () => void;
}) {
  const progress = progressOf(store);
  const active = store.active;
  const activeQuestion = active ? active.questionIds[active.index] : undefined;

  return (
    <>
      <h1>Diritto sanitario</h1>
      <p className="deck">99 quesiti, numerati come negli appunti.</p>
      {active ? (
        <button type="button" className="button-primary" onClick={onResume}>
          Riprendi la sessione
        </button>
      ) : (
        <button type="button" className="button-primary" onClick={onStart}>
          Inizia una sessione
        </button>
      )}
      {active && activeQuestion !== undefined ? (
        <p className="session-note">
          {modeLabel(active.mode)}. Domanda {active.index + 1} di {active.questionIds.length}. Quesito originale{" "}
          {activeQuestion}.
        </p>
      ) : null}

      <section className="block" aria-labelledby="percorsi">
        <h2 id="percorsi">Percorsi</h2>
        <div className="path-list">
          <button type="button" className="path" onClick={() => onSetup("practice")}>
            <span className="path-title">Allenamento</span>
            <span className="path-action">Apri</span>
            <span className="path-note">Un quesito per volta. La soluzione compare dopo la conferma.</span>
          </button>
          <button type="button" className="path" onClick={() => onSetup("simulation")}>
            <span className="path-title">Simulazione</span>
            <span className="path-action">Apri</span>
            <span className="path-note">Puoi tornare indietro e cambiare risposta. Le soluzioni compaiono dopo la consegna.</span>
          </button>
          {store.mistakes.length > 0 ? (
            <button type="button" className="path" onClick={onReview}>
              <span className="path-title">Ripasso errori</span>
              <span className="path-action">Apri</span>
              <span className="path-note">{piece(store.mistakes.length, "quesito da ripassare", "quesiti da ripassare")}.</span>
            </button>
          ) : (
            <div className="path path-static">
              <h3 className="path-title">Ripasso errori</h3>
              <p className="path-note">Nessun errore da ripassare</p>
            </div>
          )}
        </div>
      </section>

      {store.lastResult ? (
        <p className="result-link">
          <button type="button" className="text-button" onClick={onResult}>
            Ultimo risultato · {modeLabel(store.lastResult.mode)} · {summarize(store.lastResult).wrong}{" "}
            {summarize(store.lastResult).wrong === 1 ? "errore" : "errori"}
          </button>
        </p>
      ) : null}

      <section className="block" aria-labelledby="progresso">
        <h2 id="progresso">Progresso</h2>
        <p className="quiet">Corrette e da ripassare contano l’ultimo esito di ogni quesito.</p>
        <dl className="stats">
          <div>
            <dt>Affrontati</dt>
            <dd>
              {progress.faced} di {progress.total}
            </dd>
          </div>
          <div>
            <dt>Corrette</dt>
            <dd>{progress.correct}</dd>
          </div>
          <div>
            <dt>Da ripassare</dt>
            <dd>{progress.mistakes}</dd>
          </div>
        </dl>
      </section>
    </>
  );
}

export function SetupScreen({
  mode,
  mistakes,
  onStart,
}: {
  mode: Mode;
  mistakes: number;
  onStart: (start: StartRequest) => void;
}) {
  const [count, setCount] = useState<CountChoice>(10);
  const [order, setOrder] = useState<OrderMode>(mode === "simulation" ? "random" : "original");

  if (mode === "review") {
    return (
      <>
        <h1>Ripasso errori</h1>
        {mistakes === 0 ? (
          <p>Nessun errore da ripassare</p>
        ) : (
          <>
            <p className="deck">{piece(mistakes, "quesito", "quesiti")}, nell’ordine del quaderno.</p>
            <button
              type="button"
              className="button-primary"
              onClick={() => onStart({ mode: "review", count: 99, order: "original" })}
            >
              Inizia il ripasso
            </button>
          </>
        )}
      </>
    );
  }

  return (
    <>
      <h1>{modeLabel(mode)}</h1>
      <p className="deck">
        {mode === "practice"
          ? "Un quesito per volta. La soluzione compare dopo la conferma."
          : "Puoi tornare indietro e cambiare risposta fino alla consegna."}
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onStart({ mode, count, order });
        }}
      >
        <fieldset className="choice-set">
          <legend>Quanti quesiti</legend>
          {(
            [
              [10, "10"],
              [20, "20"],
              [99, "Tutte le 99"],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="option">
              <input
                type="radio"
                name="count"
                value={value}
                checked={count === value}
                onChange={() => setCount(value)}
              />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
        <fieldset className="choice-set">
          <legend>Ordine</legend>
          <label className="option">
            <input
              type="radio"
              name="order"
              value="original"
              checked={order === "original"}
              onChange={() => setOrder("original")}
            />
            <span>Originale</span>
          </label>
          <label className="option">
            <input
              type="radio"
              name="order"
              value="random"
              checked={order === "random"}
              onChange={() => setOrder("random")}
            />
            <span>Casuale</span>
          </label>
        </fieldset>
        <p className="quiet">
          {orderHelp(count, order)} Le quattro risposte sono mescolate all’inizio e restano fisse per tutta la sessione.
        </p>
        <button type="submit" className="button-primary">
          {mode === "practice" ? "Inizia allenamento" : "Inizia simulazione"}
        </button>
      </form>
    </>
  );
}

export function QuizScreen({
  session,
  onSelect,
  onConfirm,
  onMove,
  onFinish,
  onSubmit,
}: {
  session: Session;
  onSelect: (optionId: string) => void;
  onConfirm: () => void;
  onMove: (delta: number) => void;
  onFinish: () => void;
  onSubmit: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);
  const questionId = session.questionIds[session.index];
  const question = questionId === undefined ? undefined : questionMap.get(questionId);
  const order = questionId === undefined ? undefined : session.optionOrder[String(questionId)];
  const confirmed = questionId !== undefined && session.confirmed[String(questionId)] === true;
  const selectedId = questionId === undefined ? undefined : session.selections[String(questionId)];

  useEffect(() => {
    if (!confirmed) headingRef.current?.focus();
  }, [questionId, confirmed]);

  useEffect(() => {
    if (confirmed) statusRef.current?.focus();
  }, [confirmed, questionId]);

  if (!question || !order || questionId === undefined) return <p>Quesito non disponibile.</p>;

  const options = presentOptions(question, order);
  const selected = options.find((option) => option.id === selectedId) ?? null;
  const correct = options.find((option) => option.id === question.correctOptionId);
  const last = session.index === session.questionIds.length - 1;
  const practiceLike = session.mode !== "simulation";
  const missing = countMissing(session);

  return (
    <div className="quiz">
      <p className="kicker">{modeLabel(session.mode)}</p>
      <p className="progress-line">
        <span>
          Domanda {session.index + 1} di {session.questionIds.length}
        </span>
        <span>Quesito originale {question.id}</span>
      </p>
      <h1 tabIndex={-1} ref={headingRef}>
        {question.prompt}
      </h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (practiceLike) onConfirm();
        }}
      >
        <fieldset className="answers" disabled={practiceLike && confirmed}>
          <legend className="sr-only">Scegli una risposta</legend>
          {options.map((option) => (
            <label key={option.id} className="option">
              <input
                type="radio"
                name={`risposta-${question.id}`}
                value={option.id}
                checked={selectedId === option.id}
                onChange={() => onSelect(option.id)}
              />
              <span className="letter" aria-hidden="true">
                {option.letter}
              </span>
              <span className="option-text">
                <span className="sr-only">{option.letter}. </span>
                {option.text}
              </span>
            </label>
          ))}
        </fieldset>

        {practiceLike && confirmed && correct ? (
          <div className="feedback" role="status" tabIndex={-1} ref={statusRef}>
            <p className={selected?.id === correct.id ? "outcome outcome-correct" : "outcome"}>
              {selected?.id === correct.id ? "Corretta" : "Da ripassare"}
            </p>
            <AnswerPair selected={selected} correct={correct} />
          </div>
        ) : null}

        {practiceLike ? (
          <div className="quiz-dock">
            {confirmed ? (
              <button type="button" className="button-primary" onClick={last ? onFinish : () => onMove(1)}>
                {last ? "Vedi risultato" : "Successiva"}
              </button>
            ) : (
              <button type="submit" className="button-primary" disabled={!selectedId}>
                Conferma risposta
              </button>
            )}
          </div>
        ) : (
          <div className="sim-actions quiz-dock">
            <p className="quiet">{selected ? "Risposta segnata" : "Senza risposta"}</p>
            <div className="quiz-nav">
              <button type="button" className="button-secondary" onClick={() => onMove(-1)} disabled={session.index === 0}>
                Precedente
              </button>
              <button type="button" className="button-secondary" onClick={() => onMove(1)} disabled={last}>
                Successiva
              </button>
            </div>
            <p className="quiet">
              {missing === 0 ? "Non manca nessuna risposta." : missing === 1 ? "Manca 1 risposta." : `Mancano ${missing} risposte.`}
            </p>
            <button type="button" className="button-primary" onClick={onSubmit}>
              Consegna
            </button>
          </div>
        )}
      </form>
    </div>
  );
}

function statusLabel(status: "correct" | "wrong" | "omitted"): string {
  if (status === "correct") return "Corretta";
  if (status === "wrong") return "Errata";
  return "Omessa";
}

export function ResultScreen({
  session,
  onHome,
  onReview,
  canReview,
}: {
  session: Session;
  onHome: () => void;
  onReview: () => void;
  canReview: boolean;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const summary = summarize(session);
  const celebrate = earnsTiger(session.mode, summary.percent);
  const [tigerOn, setTigerOn] = useState(celebrate);

  useEffect(() => {
    if (!celebrate) {
      setTigerOn(false);
      return;
    }
    setTigerOn(true);
    const timer = window.setTimeout(() => setTigerOn(false), 5000);
    return () => window.clearTimeout(timer);
  }, [celebrate, session.id]);

  useEffect(() => {
    if (tigerOn) return;
    headingRef.current?.focus();
  }, [session.id, tigerOn]);

  return (
    <div className="result">
      {tigerOn ? (
        <div className="tiger" role="status">
          <img src={tigerGif} alt="" />
          <p>La mia regina ha spaccato grrrr miao roar</p>
        </div>
      ) : null}
      <div aria-hidden={tigerOn || undefined}>
      <p className="kicker">
        {modeLabel(session.mode)} · {piece(summary.total, "quesito", "quesiti")}
      </p>
      <h1 tabIndex={-1} ref={headingRef}>
        {errorHeadline(summary.wrong)}
      </h1>
      <p>{scoreSentence(summary)}</p>
      <dl className="stats">
        <div>
          <dt>Corrette</dt>
          <dd>{summary.correct}</dd>
        </div>
        <div>
          <dt>Errate</dt>
          <dd>{summary.wrong}</dd>
        </div>
        <div>
          <dt>Omesse</dt>
          <dd>{summary.omitted}</dd>
        </div>
        <div>
          <dt>Percentuale</dt>
          <dd>{summary.percent}%</dd>
        </div>
      </dl>

      <section className="block" aria-labelledby="elenco-errori">
        <h2 id="elenco-errori">Errori</h2>
        {summary.errors.length === 0 ? (
          <p>In questa sessione non hai risposte da correggere.</p>
        ) : (
          <>
            <p>Per ogni errore: la risposta scelta e la risposta giusta.</p>
            <ol className="error-list">
              {summary.errors.map((item) => (
                <li key={item.question.id} className="error-item">
                  <p className="progress-line">
                    <span>
                      Domanda {item.position} di {item.total}
                    </span>
                    <span>Quesito originale {item.question.id}</span>
                  </p>
                  <h3>{item.question.prompt}</h3>
                  <AnswerPair selected={item.selected} correct={item.correct} />
                </li>
              ))}
            </ol>
          </>
        )}
      </section>

      <div className="stack result-actions">
        {canReview ? (
          <button type="button" className="button-primary" onClick={onReview}>
            Ripassa gli errori
          </button>
        ) : null}
        <button type="button" className="button-secondary" onClick={onHome}>
          Torna al quaderno
        </button>
      </div>

      {summary.omissions.length > 0 ? (
        <section className="block" aria-labelledby="elenco-omesse">
          <h2 id="elenco-omesse">Senza risposta</h2>
          <p>{omissionHeadline(summary.omitted)} Non sono contate tra gli errori.</p>
          <ol className="error-list">
            {summary.omissions.map((item) => (
              <li key={item.question.id} className="error-item">
                <p className="progress-line">
                  <span>
                    Domanda {item.position} di {item.total}
                  </span>
                  <span>Quesito originale {item.question.id}</span>
                </p>
                <h3>{item.question.prompt}</h3>
                <AnswerPair selected={null} correct={item.correct} />
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      <details className="block review-all">
        <summary id="tutti-quesiti">Rivedi tutti i quesiti</summary>
        <ol className="error-list">
          {summary.items.map((item) => (
            <li key={item.question.id} className="error-item">
              <p className="progress-line">
                <span>
                  Domanda {item.position} di {item.total}
                </span>
                <span>Quesito originale {item.question.id}</span>
                <span className={item.status === "correct" ? "status status-correct" : "status"}>
                  {statusLabel(item.status)}
                </span>
              </p>
              <h3>{item.question.prompt}</h3>
              <AnswerPair selected={item.status === "omitted" ? null : item.selected} correct={item.correct} />
            </li>
          ))}
        </ol>
      </details>
      </div>
    </div>
  );
}

export function SettingsScreen({ onReset }: { onReset: () => void }) {
  return (
    <>
      <h1>Impostazioni</h1>
      <p className="deck">
        Il quaderno conserva su questo dispositivo la sessione, l’ordine dei quesiti, l’ordine delle risposte, le scelte e
        gli errori.
      </p>
      <section className="block" aria-labelledby="azzera">
        <h2 id="azzera">Azzera progressi</h2>
        <p>Cancella la sessione in corso, l’ultimo risultato e l’elenco degli errori.</p>
        <button type="button" className="button-secondary" onClick={onReset}>
          Azzera progressi
        </button>
      </section>
    </>
  );
}

export function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element || element.open) return;
    element.showModal();
  }, []);

  return (
    <dialog ref={ref} className="sheet-dialog" onClose={onClose} aria-labelledby="dialog-title">
      <h2 id="dialog-title">{title}</h2>
      {children}
    </dialog>
  );
}
