import { useCallback, useEffect, useRef, useState } from 'react';
import { createPawsGame } from '../game/engine.js';
import { loadProgress } from '../game/progress.js';
import { describeResult } from '../game/spec.js';
import BearShelf from './BearShelf.jsx';

const SOUND_KEY = 'thousandpaws-sound';
const VIEWS = [
  ['play', 'Arcade'],
  ['counter', 'Counter'],
  ['shelf', 'Bear shelf'],
];
const BUTTON_LABEL = { idle: 'Start', running: 'Stop!', won: 'Play again', missed: 'Try again' };
const HINT = { idle: 'Press the button to start the counter.', running: 'Stop it on exactly 1000.' };
const CARD = 'rounded-2xl border border-violet-800 bg-violet-900/60 p-3.5';
const PILL = 'rounded-full border border-violet-700 bg-violet-950 px-3 py-1.5 text-xs font-extrabold text-violet-100';

function readFlag(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === '1'; } catch { return fallback; }
}
function writeFlag(key, value) {
  try { localStorage.setItem(key, value ? '1' : '0'); } catch { /* storage unavailable */ }
}
// ?seed=123 replays the same rounds, for tests and screenshots.
function readSeed() {
  const seed = Number(new URLSearchParams(window.location.search).get('seed') ?? NaN);
  return Number.isFinite(seed) ? seed : undefined;
}

export default function ThousandPaws() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [phase, setPhase] = useState('idle');
  const [result, setResult] = useState(null);
  const [progress, setProgress] = useState(loadProgress);
  const [view, setView] = useState('play');
  const [sound, setSound] = useState(() => readFlag(SOUND_KEY, true));
  const [confirmReset, setConfirmReset] = useState(false);

  // Boot the engine once the canvas exists; tear it down on unmount.
  useEffect(() => {
    const game = createPawsGame({ stage: canvasRef.current }, {
      seed: readSeed(),
      onPhase: setPhase,
      onResult: setResult,
      onProgress: setProgress,
      onView: setView,
    });
    game.setMuted(!readFlag(SOUND_KEY, true));
    gameRef.current = game;
    return () => { game.destroy(); gameRef.current = null; };
  }, []);

  useEffect(() => { gameRef.current?.setMuted(!sound); writeFlag(SOUND_KEY, sound); }, [sound]);
  useEffect(() => {
    if (!confirmReset) return undefined;
    const timer = setTimeout(() => setConfirmReset(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmReset]);

  const press = useCallback(() => gameRef.current?.press(), []);
  const unlockAudio = useCallback(() => gameRef.current?.unlockAudio(), []);
  const toggleSound = useCallback(() => { unlockAudio(); setSound((v) => !v); }, [unlockAudio]);
  const resetShelf = useCallback(() => {
    if (!confirmReset) { setConfirmReset(true); return; }
    gameRef.current?.resetProgress();
    setResult(null);
    setConfirmReset(false);
  }, [confirmReset]);

  // Keyboard: Space or Enter presses the button, M toggles sound.
  useEffect(() => {
    const onKeyDown = (e) => {
      const onOtherButton = e.target instanceof HTMLButtonElement && e.target.dataset.role !== 'press';
      if (e.key === ' ' || e.key === 'Enter') {
        if (onOtherButton) return;
        e.preventDefault();
        if (!e.repeat) press();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleSound();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [press, toggleSound]);

  const message = phase === 'won' || phase === 'missed' ? describeResult(result) : HINT[phase];
  const tone = phase === 'won' ? 'text-teal-300' : phase === 'missed' ? 'text-rose-300' : 'text-amber-50';

  return (
    <main
      className="grid h-dvh grid-cols-[minmax(0,1fr)_348px] bg-slate-950 text-amber-50 max-lg:h-auto max-lg:min-h-dvh max-lg:grid-cols-1"
      onPointerDownCapture={unlockAudio}
    >
      <section className="relative min-h-0 min-w-0 overflow-hidden max-lg:h-[58dvh]" aria-label="3D arcade with the counter cabinet and the bear shelf">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 block h-full w-full touch-none"
          role="img"
          aria-label="Arcade cabinet with a four-digit counter and a big red button, beside a shelf of eight teddy bears"
        />
        <header className="pointer-events-none absolute top-3.5 left-4 grid gap-0.5">
          <h1 className="m-0 font-display text-xl font-normal tracking-wide text-amber-300">Thousand Paws</h1>
          <p className="m-0 text-xs font-bold text-violet-300">Stop the counter on exactly 1000. Win a bear.</p>
        </header>
        <div className="absolute bottom-3.5 left-1/2 flex max-w-[calc(100%-24px)] -translate-x-1/2 gap-0.5 rounded-full border border-violet-800 bg-violet-950/85 p-1" role="group" aria-label="Camera view">
          {VIEWS.map(([id, name]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => gameRef.current?.setView(id)}
              className="rounded-full border-0 bg-transparent px-3 py-1.5 text-xs font-extrabold whitespace-nowrap text-violet-200 aria-pressed:bg-amber-300 aria-pressed:text-violet-950"
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      <aside className="flex flex-col gap-3 overflow-y-auto border-l border-violet-800 bg-violet-950 p-3.5 max-lg:border-t max-lg:border-l-0">
        <button
          type="button"
          data-role="press"
          onClick={press}
          className="rounded-2xl border-0 bg-[var(--btn-red)] px-4 py-4 font-display text-2xl tracking-wide text-white shadow-[0_6px_0_var(--btn-red-deep)] active:translate-y-1 active:shadow-[0_2px_0_var(--btn-red-deep)]"
        >
          {BUTTON_LABEL[phase]}
        </button>

        <section className={CARD}>
          <p data-role="result" aria-live="polite" className={'m-0 min-h-14 text-lg leading-snug font-extrabold ' + tone}>{message}</p>
          <dl className="m-0 mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <dt className="text-[11px] font-bold tracking-wider text-violet-300 uppercase">Attempts</dt>
              <dd className="m-0 font-display text-xl text-amber-300 tabular-nums">{progress.attempts}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold tracking-wider text-violet-300 uppercase">Wins</dt>
              <dd className="m-0 font-display text-xl text-teal-300 tabular-nums">{progress.wins}</dd>
            </div>
            <div>
              <dt className="text-[11px] font-bold tracking-wider text-violet-300 uppercase">Closest miss</dt>
              <dd className="m-0 font-display text-xl text-[var(--brand-candy)] tabular-nums">{progress.closest === null ? '–' : progress.closest}</dd>
            </div>
          </dl>
        </section>

        <BearShelf unlocked={progress.unlocked} />

        <section className={CARD}>
          <div className="mb-3 flex flex-wrap gap-2">
            <button type="button" className={PILL} aria-pressed={sound} onClick={toggleSound}>Sound: {sound ? 'on' : 'off'}</button>
            <button type="button" className={PILL} onClick={resetShelf}>{confirmReset ? 'Press again to lock every bear' : 'Reset shelf'}</button>
          </div>
          <ul className="m-0 grid list-disc gap-1.5 pl-5 text-sm text-violet-200">
            <li>Press the red button, or Space, to start the counter.</li>
            <li>It speeds up and slows down at random. Press again when it reads exactly 1000.</li>
            <li>Each win unlocks a bear, and the next 1000 goes by a little faster.</li>
            <li>Drag the background to look around. Scroll to zoom.</li>
          </ul>
        </section>
      </aside>
    </main>
  );
}
