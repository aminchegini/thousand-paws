import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@paws/ui';
import { createPawsGame } from '../game/engine.js';
import { skinOf } from '../game/palette.js';
import { loadProgress } from '../game/progress.js';
import BearShelf from './BearShelf.jsx';
import FinishPicker from './FinishPicker.jsx';
import HowToPlay from './HowToPlay.jsx';
import ResultCard from './ResultCard.jsx';

const SOUND_KEY = 'thousandpaws-sound';
const SKIN_KEY = 'thousandpaws-skin';
const VIEWS = [
  ['play', 'Arcade'],
  ['counter', 'Counter'],
  ['shelf', 'Bear shelf'],
];
const BUTTON_LABEL = { idle: 'Start', running: 'Stop!', won: 'Play again', missed: 'Try again' };

function readFlag(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === '1'; } catch { return fallback; }
}
function writeFlag(key, value) {
  try { localStorage.setItem(key, value ? '1' : '0'); } catch { /* storage unavailable */ }
}
function readSkin() {
  try { return skinOf(localStorage.getItem(SKIN_KEY)); } catch { return skinOf(); }
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
  const [skin, setSkin] = useState(readSkin);
  const [confirmReset, setConfirmReset] = useState(false);

  // Boot the engine once the canvas exists; tear it down on unmount.
  useEffect(() => {
    const game = createPawsGame({ stage: canvasRef.current }, {
      seed: readSeed(),
      initialSkin: readSkin(),
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
  // The page follows the skin through the tokens' data-skin attribute; the 3D arcade is told directly.
  useEffect(() => {
    document.documentElement.dataset.skin = skin;
    gameRef.current?.setSkin(skin);
    try { localStorage.setItem(SKIN_KEY, skin); } catch { /* storage unavailable */ }
  }, [skin]);
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

  return (
    <main
      className="grid h-dvh grid-cols-[minmax(0,1fr)_348px] bg-surface-page text-text-default max-lg:h-auto max-lg:min-h-dvh max-lg:grid-cols-1"
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
          <h1 className="m-0 font-display text-lg font-normal tracking-wide text-accent-trim">Thousand Paws</h1>
          <p className="m-0 max-w-44 text-sm font-bold text-text-muted">Stop the counter on exactly 1000. Win a bear.</p>
        </header>
        <div className="absolute bottom-3.5 left-1/2 flex max-w-[calc(100%-24px)] -translate-x-1/2 gap-0.5 rounded-pill border border-border-default bg-surface-panel/85 p-1" role="group" aria-label="Camera view">
          {VIEWS.map(([id, name]) => (
            <button
              key={id}
              type="button"
              aria-pressed={view === id}
              onClick={() => gameRef.current?.setView(id)}
              className="rounded-pill border-0 bg-transparent px-3 py-1.5 text-sm font-extrabold whitespace-nowrap text-text-muted aria-pressed:bg-accent-trim aria-pressed:text-text-on-accent"
            >
              {name}
            </button>
          ))}
        </div>
      </section>

      <aside className="flex flex-col gap-3 overflow-y-auto border-l border-border-default bg-surface-panel p-3.5 max-lg:border-t max-lg:border-l-0">
        <Button data-role="press" className="press-button" onClick={press}>{BUTTON_LABEL[phase]}</Button>
        <ResultCard phase={phase} result={result} progress={progress} />
        <BearShelf unlocked={progress.unlocked} />
        <FinishPicker skin={skin} onChange={setSkin} />
        <HowToPlay sound={sound} onToggleSound={toggleSound} confirmReset={confirmReset} onReset={resetShelf} />
      </aside>
    </main>
  );
}
