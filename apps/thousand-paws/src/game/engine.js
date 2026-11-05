// Runs the arcade: boots the counter simulation, builds the 3D model, handles the orbit
// camera, view presets and pointer input on the button, and returns a controller the
// React UI drives. createPawsGame({ stage }, handlers)

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { disposeObject } from '@paws/arcade-kit';
import { createCounterSim, mulberry32 } from './counter.js';
import { createSfx } from './sfx.js';
import { buildArcade, CAB_X, SHELF_X } from './arcade.js';
import { loadProgress, saveProgress, clearProgress, nextBear } from './progress.js';
import { END_ZONE, TARGET, pad4 } from './spec.js';
import { paletteFor, skinOf } from './palette.js';

const FOV = 28;
const TICK_GAP = 0.06;      // seconds between counter ticks at most, so a sprint does not buzz
const COOLDOWN = 0.7;       // a press this soon after a result is ignored, so a double tap does not restart

// Camera presets: what to centre on, from which direction, and how much must fit in frame.
const VIEWS = {
  play: { target: [0.3, 8.4, 0], yaw: 0.05, pitch: 0.14, fit: [24, 22] },   // headroom for the page title
  counter: { target: [CAB_X, 9.4, 0.5], yaw: -0.12, pitch: 0.16, fit: [9, 12] },
  shelf: { target: [SHELF_X, 6.6, 0], yaw: 0.18, pitch: 0.08, fit: [12.5, 14.5] },
};

export function createPawsGame({ stage }, handlers = {}) {
  const canvas = stage;
  const sfx = createSfx();
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.NeutralToneMapping;   // keeps the bear colours saturated
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  let palette = paletteFor(handlers.initialSkin);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(palette.room);
  scene.fog = new THREE.Fog(palette.room, 70, 170);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.3;

  const camera = new THREE.PerspectiveCamera(FOV, 4 / 3, 0.5, 400);

  const hemi = new THREE.HemisphereLight(palette.light, palette.lightGround, 0.75);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(palette.light, 1.1);
  key.position.set(9, 12, 26);
  scene.add(key);
  const sun = new THREE.DirectionalLight(palette.light, 1.3);
  sun.position.set(3, 24, 12);
  sun.target.position.set(0, 6, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -15, right: 15, top: 15, bottom: -15, near: 1, far: 60 });
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  let arcade = buildArcade(scene, palette);

  // What the LED display shows, kept here so a rebuilt arcade can show it again.
  const led = { main: pad4(0), sub: 'PRESS TO START', blink: false };
  function show(main, blink = false, sub = led.sub) {
    Object.assign(led, { main, sub, blink });
    arcade.display.set(main, blink);
    arcade.display.setSub(sub);
  }

  // ---- simulation and progress ----
  let progress = loadProgress();
  let cooldown = 0;
  let sinceTick = 0;
  let drawnValue = -1;
  const pickRnd = mulberry32((handlers.seed ?? Date.now()) ^ 0x9e3779b9);
  arcade.setUnlocked(progress.unlocked);
  show(led.main);

  // A skin recolours everything, so the arcade is rebuilt in the new palette.
  function setSkin(id) {
    if (skinOf(id) === palette.mode) return;
    palette = paletteFor(id);
    scene.background.set(palette.room);
    scene.fog.color.set(palette.room);
    hemi.color.set(palette.light);
    hemi.groundColor.set(palette.lightGround);
    key.color.set(palette.light);
    sun.color.set(palette.light);
    arcade.dispose();
    arcade = buildArcade(scene, palette);
    arcade.setUnlocked(progress.unlocked);
    show(led.main, led.blink);
  }

  function onResult(result) {
    cooldown = COOLDOWN;
    let bear = null;
    progress = { ...progress, attempts: progress.attempts + 1 };
    if (result.win) {
      bear = nextBear(progress.unlocked, pickRnd);
      progress.wins += 1;
      if (bear) progress.unlocked = [...progress.unlocked, bear.id];
      sim.setLevel(progress.unlocked.length);
      arcade.setUnlocked(progress.unlocked);
      arcade.celebrate(bear?.id, { confetti: !reduceMotion });
      show(String(TARGET), true, bear ? `WINNER  ${bear.name.toUpperCase()}` : 'WINNER  SHELF FULL');
      sfx.win();
      if (bear && activeView) setView('shelf');
    } else {
      if (result.reason === 'press') {
        const off = Math.abs(result.diff);
        progress.closest = progress.closest === null ? off : Math.min(progress.closest, off);
      }
      show(pad4(result.value), true, result.reason === 'timeout' ? 'TOO LATE' : `${Math.abs(result.diff)} ${result.diff < 0 ? 'SHORT' : 'OVER'}`);
      sfx.miss();
    }
    saveProgress(progress);
    handlers.onProgress?.(progress);
    handlers.onResult?.({ ...result, bear });
  }

  const sim = createCounterSim({
    onPhase: (phase) => handlers.onPhase?.(phase),
    onResult,
  }, { seed: handlers.seed, level: progress.unlocked.length });

  // ---- camera: orbit plus smooth preset moves ----
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 10;
  controls.maxDistance = 120;
  controls.maxPolarAngle = 1.54;
  controls.minAzimuthAngle = -1.15;   // the room has a back wall
  controls.maxAzimuthAngle = 1.15;
  let activeView = 'play';
  let tween = null;

  function viewPose(name) {
    const v = VIEWS[name];
    const tanH = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    const dist = Math.max((v.fit[1] / 2) / tanH, (v.fit[0] / 2) / (tanH * camera.aspect));
    const target = new THREE.Vector3(...v.target);
    const pos = new THREE.Vector3(
      Math.sin(v.yaw) * Math.cos(v.pitch), Math.sin(v.pitch), Math.cos(v.yaw) * Math.cos(v.pitch),
    ).multiplyScalar(dist).add(target);
    return { pos, target };
  }
  function setView(name, instant = false) {
    if (!VIEWS[name]) return;
    activeView = name;
    handlers.onView?.(name);
    const to = viewPose(name);
    if (instant || reduceMotion) {
      camera.position.copy(to.pos); controls.target.copy(to.target); controls.update(); tween = null;
      return;
    }
    tween = { t: 0, fromPos: camera.position.clone(), fromTarget: controls.target.clone(), to };
  }
  function stepTween(dt) {
    if (!tween) return;
    tween.t = Math.min(1, tween.t + dt / 0.9);
    const e = tween.t < 0.5 ? 4 * tween.t ** 3 : 1 - Math.pow(-2 * tween.t + 2, 3) / 2;
    camera.position.lerpVectors(tween.fromPos, tween.to.pos, e);
    controls.target.lerpVectors(tween.fromTarget, tween.to.target, e);
    if (tween.t >= 1) tween = null;
  }
  controls.addEventListener('start', () => {
    tween = null;
    if (activeView) { activeView = null; handlers.onView?.(null); }
  });

  function resize() {
    const w = canvas.clientWidth || 800;
    const h = canvas.clientHeight || 600;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (activeView) setView(activeView, true);
  }
  const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
  if (ro) ro.observe(canvas); else window.addEventListener('resize', resize);
  resize();

  // ---- pointer input on the button ----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(e) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    return raycaster.intersectObjects(arcade.hitTargets, false).length > 0;
  }
  function onPointerDown(e) {
    if (!pick(e)) return;
    controls.enabled = false;           // this gesture belongs to the button, not the camera
    api.press();
  }
  function onPointerMove(e) {
    if (e.pointerType === 'mouse' && e.buttons === 0) canvas.style.cursor = pick(e) ? 'pointer' : 'move';
  }
  function onPointerUp() { controls.enabled = true; }
  canvas.addEventListener('pointerdown', onPointerDown, { capture: true });
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // ---- loop ----
  let raf = 0;
  let alive = true;
  let last = performance.now();
  function tick(dt, draw = true) {
    cooldown = Math.max(0, cooldown - dt);
    sinceTick += dt;
    sim.update(dt);
    const state = sim.getState();
    if (state.phase === 'running' && state.value !== drawnValue) {
      drawnValue = state.value;
      show(pad4(state.value));
      if (sinceTick >= TICK_GAP) { sinceTick = 0; sfx.tick(Math.min(1, state.value / TARGET)); }
    }
    arcade.update(dt, state);
    stepTween(dt);
    controls.update();
    if (draw) renderer.render(scene, camera);
    sim.drawn();   // from here on a press is judged against the number just drawn
  }
  function frame(now) {
    if (!alive) return;
    tick(Math.min(1 / 30, Math.max(0, (now - last) / 1000))); last = now;
    raf = requestAnimationFrame(frame);
  }
  setView('play', true);
  raf = requestAnimationFrame(frame);

  // Development only: step the game clock by hand (handy when the tab is in the
  // background and gets no animation frames). Stepped frames are not drawn until the
  // last one, so a long step stays fast. Stripped from production builds.
  if (import.meta.env.DEV) {
    const settle = () => { renderer.render(scene, camera); last = performance.now(); };
    window.__thousandPaws = {
      advance(seconds) { for (let i = 0, n = Math.round(seconds * 60); i < n; i++) tick(1 / 60, false); settle(); },
      // Steps a running round until the screen shows `value`. Only numbers from the
      // run-in onward are certain to be shown.
      runTo(value) {
        if (value < END_ZONE) throw new Error(`runTo needs a value of ${END_ZONE} or more`);
        for (let i = 0; i < 60 * 120; i++) {
          const s = sim.getState();
          if (s.phase !== 'running' || s.shown === value) break;
          tick(1 / 60, false);
        }
        settle();
        return sim.getState();
      },
      state() { return { ...sim.getState(), progress }; },
      stats() { const { calls, triangles } = renderer.info.render; return { calls, triangles }; },
      // Screen position of the button, for driving it with pointer events in tests.
      where() {
        const v = arcade.hitTargets[1].getWorldPosition(new THREE.Vector3()).project(camera);
        const r = canvas.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      },
    };
  }

  const api = {
    // The one control: starts a round, or stops the running one.
    press() {
      sfx.unlock();
      arcade.pressButton();
      if (sim.getState().phase === 'running') { sfx.press(); sim.press(); return; }
      if (cooldown > 0) return;
      drawnValue = -1;
      sim.start();
      show(pad4(0), false, 'STOP AT 1000');
      sfx.start();
      if (activeView === 'shelf') setView('play');
    },
    setView,
    setSkin,
    setMuted(m) { sfx.setMuted(m); },
    unlockAudio() { sfx.unlock(); },
    resetProgress() {
      progress = clearProgress();
      sim.setLevel(0);
      arcade.setUnlocked(progress.unlocked);
      handlers.onProgress?.(progress);
    },
    getState() { return { ...sim.getState(), progress }; },
    destroy() {
      alive = false;
      if (import.meta.env.DEV && window.__thousandPaws) delete window.__thousandPaws;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointerDown, { capture: true });
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      controls.dispose();
      sfx.destroy();
      disposeObject(scene);
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
  return api;
}

// Under Vite HMR the running game keeps the old module's closures, so reload the
// page whenever this module (or the modules it imports) changes.
if (import.meta.hot) {
  import.meta.hot.accept(() => window.location.reload());
}
