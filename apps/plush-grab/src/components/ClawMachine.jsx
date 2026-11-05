import { useCallback, useEffect, useRef, useState } from 'react';
import { createClawGame } from '../game/engine.js';
import { overallSizeCm, POS } from '../game/spec.js';
import { SKINS, skinById } from '../game/skins.js';
import HoldButton from './HoldButton.jsx';
import PrizeShelf from './PrizeShelf.jsx';

const SOUND_KEY = 'plushgrab-sound';
const MUSIC_KEY = 'plushgrab-music';
const SKIN_KEY = 'plushgrab-skin';
const START_CREDITS = 5;
const pad = (n) => String(n).padStart(2, '0');
const SIZE = overallSizeCm();
const VIEWS = [
  ['whole', 'Whole machine'],
  ['claw', 'Claw'],
  ['capsules', 'Capsule bay'],
  ['rear', 'Rear'],
];

function readFlag(key, fallback) {
  try { const v = localStorage.getItem(key); return v === null ? fallback : v === '1'; } catch { return fallback; }
}
function writeFlag(key, value) {
  try { localStorage.setItem(key, value ? '1' : '0'); } catch { /* storage unavailable */ }
}

function readSkin() {
  try { return skinById(localStorage.getItem(SKIN_KEY)).id; } catch { return SKINS[0].id; }
}
function applyPageColours(skin) {
  const root = document.documentElement.style;
  for (const [name, value] of Object.entries(skin.page)) {
    root.setProperty('--' + name.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase()), value);
  }
}

const POS_LABELS = {
  idle: `Tap card · ${POS.pricePerPlay}`,
  read: 'Reading card…',
  process: 'Processing…',
  approved: 'Approved, +1 play',
  full: 'Credits full, not charged',
};

const NO_KEYS = { left: false, right: false, forward: false, back: false };

export default function ClawMachine() {
  const canvasRef = useRef(null);
  const gameRef = useRef(null);
  const [led, setLed] = useState('READY · AIM');
  const [credits, setCredits] = useState(START_CREDITS);
  const [won, setWon] = useState([]);
  const [busy, setBusy] = useState(false);
  const [held, setHeld] = useState(NO_KEYS);
  const [sound, setSound] = useState(() => readFlag(SOUND_KEY, true));
  const [music, setMusic] = useState(() => readFlag(MUSIC_KEY, true));
  const [capsuleTray, setCapsuleTray] = useState(0);
  const [capsuleStatus, setCapsuleStatus] = useState('Every play drops a bonus capsule.');
  const [view, setView] = useState('whole');
  const [posState, setPosState] = useState('idle');
  const [skinId, setSkinId] = useState(readSkin);

  // Boot the engine once the canvas exists; tear it down on unmount.
  useEffect(() => {
    const game = createClawGame({ stage: canvasRef.current }, {
      initialCredits: START_CREDITS,
      initialSkin: readSkin(),
      onLed: (text) => setLed(text),
      onCredits: setCredits,
      onBusy: setBusy,
      onWon: (prize) => setWon((list) => [prize, ...list]),
      onCapsuleTray: setCapsuleTray,
      onCapsuleStatus: setCapsuleStatus,
      onCapsuleOpened: (toy) => setWon((list) => [toy, ...list]),
      onView: setView,
      onPosState: setPosState,
    });
    game.setMuted(!readFlag(SOUND_KEY, true));
    game.setMusic(readFlag(MUSIC_KEY, true));
    gameRef.current = game;
    return () => { game.destroy(); gameRef.current = null; };
  }, []);

  useEffect(() => { gameRef.current?.setMuted(!sound); writeFlag(SOUND_KEY, sound); }, [sound]);
  useEffect(() => { gameRef.current?.setMusic(music); writeFlag(MUSIC_KEY, music); }, [music]);
  useEffect(() => {
    gameRef.current?.setSkin(skinId);
    applyPageColours(skinById(skinId));
    try { localStorage.setItem(SKIN_KEY, skinId); } catch { /* storage unavailable */ }
  }, [skinId]);

  const hold = useCallback((key, down) => {
    setHeld((h) => (h[key] === down ? h : { ...h, [key]: down }));
    gameRef.current?.hold(key, down);
  }, []);
  const drop = useCallback(() => gameRef.current?.requestDrop(), []);
  const pay = useCallback(() => gameRef.current?.tapCard(), []);
  const openCapsule = useCallback(() => gameRef.current?.openCapsule(), []);
  const unlockAudio = useCallback(() => gameRef.current?.unlockAudio(), []);
  const toggleSound = useCallback(() => { unlockAudio(); setSound((v) => !v); }, [unlockAudio]);
  const toggleMusic = useCallback(() => { unlockAudio(); setMusic((m) => !m); }, [unlockAudio]);

  // Keyboard: arrows or WASD move, Space/Enter drops, O opens a capsule, P taps a card to pay, M toggles sound.
  useEffect(() => {
    const onKeyDown = (e) => {
      const onOtherButton = e.target instanceof HTMLButtonElement && e.target.dataset.role !== 'drop';
      switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A': e.preventDefault(); hold('left', true); break;
        case 'ArrowRight': case 'd': case 'D': e.preventDefault(); hold('right', true); break;
        case 'ArrowUp': case 'w': case 'W': e.preventDefault(); hold('forward', true); break;
        case 'ArrowDown': case 's': case 'S': e.preventDefault(); hold('back', true); break;
        case ' ': case 'Enter':
          if (onOtherButton) return;
          e.preventDefault();
          if (!e.repeat) drop();
          break;
        case 'p': case 'P': pay(); break;
        case 'o': case 'O': openCapsule(); break;
        case 'm': case 'M': toggleSound(); break;
        default:
      }
    };
    const onKeyUp = (e) => {
      switch (e.key) {
        case 'ArrowLeft': case 'a': case 'A': hold('left', false); break;
        case 'ArrowRight': case 'd': case 'D': hold('right', false); break;
        case 'ArrowUp': case 'w': case 'W': hold('forward', false); break;
        case 'ArrowDown': case 's': case 'S': hold('back', false); break;
        default:
      }
    };
    const onBlur = () => { for (const k of Object.keys(NO_KEYS)) hold(k, false); };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, [hold, drop, pay, openCapsule, toggleSound]);

  const clawWins = won.filter((p) => p.size !== 'capsule').length;

  return (
    <main className="viewer" onPointerDownCapture={unlockAudio}>
      <section className="stageWrap" aria-label="3D model of the Plush Grab claw machine">
        <canvas
          ref={canvasRef}
          className="stage"
          role="img"
          aria-label="Claw machine with a glass playfield, a control panel with joystick and drop button, a prize door and a built-in capsule bay"
        />
        <header className="hud">
          <h1>Plush Grab</h1>
          <p>Prototype · {SIZE.w} × {SIZE.d} × {SIZE.h} cm (W × D × H)</p>
        </header>
        <div className="views" role="group" aria-label="Camera view">
          {VIEWS.map(([id, name]) => (
            <button key={id} type="button" aria-pressed={view === id} onClick={() => gameRef.current?.setView(id)}>{name}</button>
          ))}
        </div>
        <p className="srOnly" aria-live="polite">{led}</p>
        <p className="srOnly" aria-live="polite">{posState === 'idle' ? '' : POS_LABELS[posState]}</p>
      </section>

      <aside className="side">
        <div className="touchDeck">
          <div className="dpad" role="group" aria-label="Move the claw">
            <HoldButton label="Move claw away from you" down={held.forward} onChange={(d) => hold('forward', d)}>▲</HoldButton>
            <HoldButton label="Move claw left" down={held.left} onChange={(d) => hold('left', d)}>◀</HoldButton>
            <HoldButton label="Move claw toward you" down={held.back} onChange={(d) => hold('back', d)}>▼</HoldButton>
            <HoldButton label="Move claw right" down={held.right} onChange={(d) => hold('right', d)}>▶</HoldButton>
          </div>
          <button
            type="button"
            data-role="drop"
            className={'drop' + (busy ? ' busy' : '')}
            aria-disabled={busy}
            onClick={drop}
          >
            DROP
          </button>
        </div>

        <section className="card">
          <div className="stats">
            <div><span className="lbl">Credits</span><span className="val">{pad(credits)}</span></div>
            <div><span className="lbl">Claw wins</span><span className="val">{pad(clawWins)}</span></div>
            <div><span className="lbl">Capsules</span><span className="val">{pad(capsuleTray)}</span></div>
          </div>
          <p className="capStatus" aria-live="polite">{capsuleStatus}</p>
          <div className="actions">
            <button type="button" className="pill pay" disabled={posState !== 'idle'} onClick={pay}>{POS_LABELS[posState]}</button>
            <button type="button" className="pill open" disabled={capsuleTray === 0} onClick={openCapsule}>
              Open capsule{capsuleTray > 1 ? ` (${capsuleTray})` : ''}
            </button>
          </div>
        </section>

        <section className="card">
          <h2 className="cardTitle">Cabinet finish</h2>
          <div className="skins" role="group" aria-label="Cabinet finish">
            {SKINS.map((s) => (
              <button key={s.id} type="button" className="skin" aria-pressed={skinId === s.id} onClick={() => setSkinId(s.id)}>
                <span className="dots" aria-hidden="true">
                  {s.swatch.map((c) => <i key={c} style={{ background: c }} />)}
                </span>
                <span className="skinName">{s.name}</span>
                <span className="skinTaste">{s.taste}</span>
              </button>
            ))}
          </div>
          <p className="skinFinish">{skinById(skinId).finish}</p>
        </section>

        <PrizeShelf prizes={won} />

        <section className="card help">
          <div className="actions">
            <button type="button" className="pill toggle" aria-pressed={sound} onClick={toggleSound}>Sound: {sound ? 'on' : 'off'}</button>
            <button type="button" className="pill toggle" aria-pressed={music} onClick={toggleMusic}>Music: {music ? 'on' : 'off'}</button>
          </div>
          <ul>
            <li>Drag the joystick on the machine, or use the arrow keys or WASD.</li>
            <li>Tap the card reader on the panel, or press P, to pay for a play. Payment is simulated, so no real card is charged.</li>
            <li>Press the red button or Space to drop the claw.</li>
            <li>Tap a capsule in the alcove, or press O, to open it.</li>
            <li>Drag the background to walk around the machine. Scroll to zoom.</li>
          </ul>
        </section>
      </aside>
    </main>
  );
}
