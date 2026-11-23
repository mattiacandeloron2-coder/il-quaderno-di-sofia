import { useEffect, useState } from "react";
import type { Mode, StartRequest, Store } from "./lib/study";
import {
  confirmCurrent,
  countMissing,
  emptyStore,
  finishSession,
  move,
  selectOption,
  startSession,
} from "./lib/study";
import { loadStore, saveStore } from "./lib/storage";
import { modeLabel } from "./lib/format";
import { Dialog, HomeScreen, Masthead, QuizScreen, ResultScreen, SettingsScreen, SetupScreen } from "./screens";

type DialogState =
  | null
  | { kind: "reset" }
  | { kind: "replace"; start: StartRequest }
  | { kind: "submit"; missing: number; total: number };

export default function App() {
  const [store, setStore] = useState<Store>(() => loadStore());
  const [dialog, setDialog] = useState<DialogState>(null);

  useEffect(() => {
    saveStore(store);
  }, [store]);

  useEffect(() => {
    const titles: Record<Store["view"]["name"], string> = {
      home: "Il quaderno di Sofia",
      setup: "Nuova sessione · Il quaderno di Sofia",
      quiz: "Sessione · Il quaderno di Sofia",
      result: "Errori della sessione · Il quaderno di Sofia",
      settings: "Impostazioni · Il quaderno di Sofia",
    };
    document.title = titles[store.view.name];
  }, [store.view]);

  function goHome() {
    setStore((current) => ({ ...current, view: { name: "home" } }));
  }

  function requestStart(start: StartRequest) {
    if (store.active) {
      setDialog({ kind: "replace", start });
      return;
    }
    setStore((current) => startSession(current, start));
  }

  function requestSubmit() {
    const session = store.active;
    if (!session) return;
    const missing = countMissing(session);
    if (missing > 0) {
      setDialog({ kind: "submit", missing, total: session.questionIds.length });
      return;
    }
    setStore((current) => finishSession(current));
  }

  const view = store.view;
  const atHome = view.name === "home";

  return (
    <>
      <a className="skip" href="#contenuto">
        Vai al contenuto
      </a>
      <div className="sheet">
        <Masthead
          atHome={atHome}
          showSettings={view.name !== "settings"}
          onHome={goHome}
          onSettings={() => setStore((current) => ({ ...current, view: { name: "settings" } }))}
        />
        <main id="contenuto" className={view.name === "quiz" ? "screen-quiz" : undefined}>
          {view.name === "home" ? (
            <HomeScreen
              store={store}
              onResume={() => setStore((current) => ({ ...current, view: { name: "quiz" } }))}
              onStart={() => setStore((current) => ({ ...current, view: { name: "setup", mode: "practice" } }))}
              onSetup={(mode: Mode) => setStore((current) => ({ ...current, view: { name: "setup", mode } }))}
              onReview={() => requestStart({ mode: "review", count: 99, order: "original" })}
              onResult={() => setStore((current) => ({ ...current, view: { name: "result" } }))}
            />
          ) : null}

          {view.name === "setup" ? (
            <SetupScreen mode={view.mode} mistakes={store.mistakes.length} onStart={requestStart} />
          ) : null}

          {view.name === "quiz" && store.active ? (
            <QuizScreen
              session={store.active}
              onSelect={(optionId) => setStore((current) => selectOption(current, optionId))}
              onConfirm={() => setStore((current) => confirmCurrent(current))}
              onMove={(delta) => setStore((current) => move(current, delta))}
              onFinish={() => setStore((current) => finishSession(current))}
              onSubmit={requestSubmit}
            />
          ) : null}

          {view.name === "result" && store.lastResult ? (
            <ResultScreen
              session={store.lastResult}
              canReview={store.mistakes.length > 0}
              onHome={goHome}
              onReview={() => requestStart({ mode: "review", count: 99, order: "original" })}
            />
          ) : null}

          {view.name === "settings" ? <SettingsScreen onReset={() => setDialog({ kind: "reset" })} /> : null}
        </main>
      </div>

      {dialog?.kind === "reset" ? (
        <Dialog title="Azzera progressi" onClose={() => setDialog(null)}>
          <p>Verranno cancellati la sessione, le risposte e gli errori da ripassare. L’operazione non si può annullare.</p>
          <div className="dialog-actions">
            <button type="button" className="button-secondary" onClick={() => setDialog(null)}>
              Annulla
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                setDialog(null);
                setStore(emptyStore());
              }}
            >
              Azzera progressi
            </button>
          </div>
        </Dialog>
      ) : null}

      {dialog?.kind === "replace" && store.active ? (
        <Dialog title="Sessione in corso" onClose={() => setDialog(null)}>
          <p>
            {modeLabel(store.active.mode)}, domanda {store.active.index + 1} di {store.active.questionIds.length}. Se ne
            inizi un’altra, quella attuale si chiude.
            {store.active.mode === "simulation"
              ? " Le risposte non consegnate non entrano nel progresso."
              : " Le risposte già confermate restano nel progresso."}
          </p>
          <div className="dialog-actions">
            <button type="button" className="button-secondary" onClick={() => setDialog(null)}>
              Annulla
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                const start = dialog.start;
                setDialog(null);
                setStore((current) => startSession(current, start));
              }}
            >
              Chiudi e inizia
            </button>
          </div>
        </Dialog>
      ) : null}

      {dialog?.kind === "submit" ? (
        <Dialog title="Consegna" onClose={() => setDialog(null)}>
          <p>
            {dialog.missing === 1 ? "Manca 1 risposta" : `Mancano ${dialog.missing} risposte`} su {dialog.total}. Le
            domande senza risposta restano omesse e non compaiono tra gli errori come risposte scelte.
          </p>
          <div className="dialog-actions">
            <button type="button" className="button-secondary" onClick={() => setDialog(null)}>
              Torna alle domande
            </button>
            <button
              type="button"
              className="button-primary"
              onClick={() => {
                setDialog(null);
                setStore((current) => finishSession(current));
              }}
            >
              Consegna comunque
            </button>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
