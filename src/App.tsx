import { copy } from './copy';
import { useEffect, useState } from 'react';
import { loadDeck, loadRounds, defaultDeckUrl } from './deck';
import type { AppPerson, Deck, Rounds } from './types';
import { firstUnanswered, useAnswers, type Files } from './state';
import { LocalStorageStore } from './storage/localStorageStore';
import { AppsScriptStore } from './storage/appsScriptStore';
import { CompositeStore } from './storage/compositeStore';
import { safeStorage } from './storage';
import StartScreen from './screens/StartScreen';
import CardScreen from './screens/CardScreen';
import RoundCompleteScreen from './screens/RoundCompleteScreen';
import AdminScreen from './screens/AdminScreen';
import { isTestMode } from './testMode';
import ResetScreen from './screens/ResetScreen';
const test = isTestMode(new URLSearchParams(location.search));
const hintKey = test ? '31andrews.TEST.homeHint' : '31andrews.homeHint';
interface Loaded {
  deck: Deck;
  rounds: Rounds;
  store: CompositeStore;
  files: Files;
  size: number;
}
function Kitchen({ data, reload, hash }: {
  data: Loaded;
  reload: () => void;
  hash: string;
}) {
  const { deck, store, rounds, size } = data;
  const who = new URLSearchParams(location.search).get('who');
  const state = useAnswers(deck, store, data.files, size, ['tom', 'jane', 'both', 'mark'].includes(who ?? '') ? who as AppPerson : null, test);
  const [newRound, setNewRound] = useState(false);
  const [dismissed, setDismissed] = useState(!!safeStorage.get(hintKey));
  const file = state.person ? state.files[state.person] : undefined;
  const complete = !!state.person && state.index === -1;
  useEffect(() => {
    if (!complete || new URLSearchParams(location.search).has('deck'))
      return;
    let controller: AbortController | undefined;
    const stop = () => controller?.abort();
    const check = () => {
      stop();
      controller = new AbortController();
      const current = controller;
      void loadRounds(current.signal).then(r => {
        if (!current.signal.aborted)
          setNewRound(r.current !== rounds.current);
      }).catch(() => { });
    };
    window.addEventListener('pagehide', stop);
    const timer = setInterval(check, 60000);
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', check);
    return () => {
      stop();
      window.removeEventListener('pagehide', stop);
      clearInterval(timer);
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', check);
    };
  }, [complete, rounds.current]);
  if (hash === '#/admin')
    return <AdminScreen />;
  if (!state.person)
    return <StartScreen
      test={test}
      deck={deck}
      files={state.files}
      roundTitle={rounds.rounds.find(r => r.round === deck.round)?.title ?? deck.round}
      onChoose={state.choose}

    />;
  if (complete && file)
    return <RoundCompleteScreen
      deck={deck}
      file={file}
      files={Object.values(state.files)}
      endpoint={rounds.answers_endpoint}
      onRevise={state.revise}
      onFavorite={state.favorite}
      newRound={newRound}
      onNew={reload}
      onSwitch={() => state.choose(null)}

    />;
  if (state.pause)
    return <main className="center-screen screen">
      <span className="house-mark">♥</span>
      <h1>{copy.breakTitle}</h1>
      <p>{copy.breakMessage}</p>
      <button className="primary" onClick={state.keepGoing}>{copy.keepGoing}</button>
      <button className="text-button" onClick={state.undo}>{copy.back}</button>
      <button className="text-button" onClick={() => state.choose(null)}>{copy.switchPerson}</button>
    </main>;
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const standalone = (navigator as Navigator & {
    standalone?: boolean;
  }).standalone || matchMedia('(display-mode: standalone)').matches;
  const hint = ios && !standalone && !dismissed && !!file?.answers.length ? copy.homeHint(!!rounds.answers_endpoint) : null;
  return <CardScreen
    deck={deck}
    index={Math.max(0, state.index)}
    size={size}
    person={state.person}
    onAnswer={state.answer}
    onNote={state.annotate}
    onSwitch={() => state.choose(null)}
    onUndo={state.undo}
    canUndo={!!file?.answers.length}
    hint={hint}
    dismissHint={() => {
      safeStorage.set(hintKey, 'dismissed');
      setDismissed(true);
    }}

  />;
}
let persistRequested = false;
function AnswerApp() {
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const [generation, setGeneration] = useState(0);
  const [hash, setHash] = useState(location.hash);
  useEffect(() => {
    const change = () => {
      setHash(location.hash);
      if (location.hash !== '#/admin')
        setGeneration(g => g + 1);
    };
    window.addEventListener('hashchange', change);
    if (!persistRequested) {
      persistRequested = true;
      void navigator.storage?.persist?.().catch(() => { });
    }
    return () => window.removeEventListener('hashchange', change);
  }, []);
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const stop = () => { cancelled = true; controller.abort(); };
    window.addEventListener('pagehide', stop);
    if (hash === '#/admin')
      return () => { stop(); window.removeEventListener('pagehide', stop); };
    let remote: AppsScriptStore | undefined;
    async function init() {
      setData(null);
      setError('');
      try {
        const rounds = await loadRounds(controller.signal);
        const current = rounds.rounds.find(r => r.round === rounds.current)!;
        const override = new URLSearchParams(location.search).get('deck');
        const deck = await loadDeck(override || (current.deck ? new URL(current.deck, new URL(import.meta.env.BASE_URL, document.baseURI)).href : defaultDeckUrl), controller.signal);
        if (cancelled)
          return;
        remote = rounds.answers_endpoint ? new AppsScriptStore(rounds.answers_endpoint, test, deck) : undefined;
        const store = new CompositeStore(new LocalStorageStore(deck.round, test), remote);
        const files: Files = {};
        await Promise.all(((test ? ['tom', 'jane', 'both', 'mark'] : ['tom', 'jane', 'both']) as AppPerson[]).map(async (p) => {
          const f = await store.load(deck.deck_id, p);
          if (f) {
            if (firstUnanswered(deck, f) >= 0 && f.session)
              delete f.session.finished;
            files[p] = f;
          }
        }));
        if (!cancelled)
          setData({ deck, rounds, store, files, size: Math.max(1, Math.floor(current.session_size || deck.session_size || 20)) });
      }
      catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : copy.loadError);
      }
    }
    void init();
    return () => {
      stop();
      window.removeEventListener('pagehide', stop);
      remote?.dispose();
    };
  }, [generation, hash]);
  if (hash === '#/admin')
    return <AdminScreen />;
  if (!data)
    return <main className="center-screen screen">
      <span className="house-mark">⌂</span>
      <h1>{error ? copy.pause : copy.welcome}</h1>
      <p role="status">{error || copy.loading}</p>{error && <button onClick={() => setGeneration(g => g + 1)}>{copy.retry}</button>}</main>;
  return <div className={test ? 'test-run' : undefined}>{test && <div className="test-banner" role="status">Test run: these answers are kept separate</div>}<Kitchen
    key={generation}
    data={data}
    reload={() => setGeneration(g => g + 1)}
    hash={hash}

  /></div>;
}

export default function App() {
  return new URLSearchParams(location.search).get('reset') === '1' ? <ResetScreen /> : <AnswerApp />;
}
