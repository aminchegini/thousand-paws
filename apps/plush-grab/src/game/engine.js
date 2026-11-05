// Runs the machine: boots the claw and capsule simulations, builds the one 3D
// device, handles the orbit camera, view presets and pointer input on the physical
// controls, and returns a controller the React UI drives. createClawGame({ stage }, handlers)

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { createSim } from './sim.js';
import { createCapsuleSim } from './capsules.js';
import { createPosSim } from './pos.js';
import { createSfx } from './sfx.js';
import { makeGantry, createPlushFactory, disposeObject } from './scene.js';
import { buildDevice } from './device.js';
import { createCapsuleView } from './capsuleView.js';
import { BIN } from './spec.js';
import { skinById } from './skins.js';

const BG = 0x0c0820;
const FOV = 28;
const pad = (n) => String(n).padStart(2, '0');

// Camera presets: what to centre on, from which direction, and how much must fit in frame.
const VIEWS = {
  whole: { target: [0, 0.2, 1.2], yaw: 0.34, pitch: 0.13, fit: [15.5, 27.5] },
  claw: { target: [0, 3.0, 1.5], yaw: 0, pitch: 0.2, fit: [13.5, 13.5] },
  capsules: { target: [1.4, -6.2, 4], yaw: 0.2, pitch: 0.06, fit: [9.5, 10] },
  rear: { target: [0, 0.2, 0], yaw: Math.PI - 0.42, pitch: 0.12, fit: [15.5, 27.5] },
};

export function createClawGame({ stage }, handlers = {}) {
  const canvas = stage;
  const sfx = createSfx();
  const playSfx = (name) => { if (typeof sfx[name] === 'function') sfx[name](); };
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.toneMapping = THREE.NeutralToneMapping;   // keeps the pinks and plush colours saturated
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 62, 150);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = envTex;
  scene.environmentIntensity = 0.28;

  const camera = new THREE.PerspectiveCamera(FOV, 4 / 3, 0.5, 400);

  const hemi = new THREE.HemisphereLight(0xfff4fa, 0x4a3a6a, 0.7);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 1.1);   // lights the outside of the cabinet
  key.position.set(9, 12, 26);
  scene.add(key);
  const sun = new THREE.DirectionalLight(0xffffff, 1.35);   // near-vertical so the claw's shadow marks its spot
  sun.position.set(1.2, 14, 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 1, far: 30 });
  sun.shadow.bias = -0.0004;
  scene.add(sun, sun.target);

  const device = buildDevice(scene);
  function setSkin(id) {
    const skin = skinById(id);
    const room = skin.room;
    scene.background.set(room.bg);
    scene.fog.color.set(room.bg);
    [scene.fog.near, scene.fog.far] = room.fog;
    scene.environmentIntensity = room.env;
    hemi.intensity = room.hemi;
    key.intensity = room.key;
    sun.intensity = room.sun;
    device.applySkin(skin);
  }
  setSkin(handlers.initialSkin);
  const gantry = makeGantry();
  scene.add(gantry.group);
  const plush = createPlushFactory();

  // ---- simulations ----
  let wins = 0;
  let credits = 0;
  let busy = false;
  const led = { text: 'READY · AIM', blink: false };
  const refreshDisplay = () => { device.display.setSub(`CREDITS ${pad(credits)}   WON ${pad(wins)}`); };

  const binToys = [];
  function deliverToBin(prize) {
    const m = plush.make(prize.kind, prize.color, prize.r);
    m.position.set(BIN.x, BIN.floorY + prize.r, BIN.restZ);
    m.rotation.y = 0.3;
    scene.add(m);
    binToys.push({ mesh: m, r: prize.r, t: 0, opened: false });
  }

  const capsules = createCapsuleSim({
    onSfx: playSfx,
    onTray: handlers.onCapsuleTray,
    onStatus: handlers.onCapsuleStatus,
    onSign: (text, blink) => device.sign.set(text, blink),
    onOpened: handlers.onCapsuleOpened,
  });
  const sim = createSim({
    initialCredits: handlers.initialCredits,
    onLed: (text, blink) => { led.text = text; led.blink = blink; device.display.set(text, blink); handlers.onLed?.(text, blink); },
    onCredits: (n) => { credits = n; refreshDisplay(); handlers.onCredits?.(n); },
    onBusy: (b) => { busy = b; handlers.onBusy?.(b); },
    onWon: (prize) => { wins++; refreshDisplay(); deliverToBin(prize); handlers.onWon?.(prize); },
    onSfx: playSfx,
    onMotor: (on) => sfx.motor(on),
    onPlayEnd: () => capsules.dispense(),   // every play pays out a capsule, win or lose
  });
  const pos = createPosSim({
    canAccept: () => credits < 99,
    onApproved: () => sim.addCredit(),
    onSfx: playSfx,
    onState: (s) => handlers.onPosState?.(s),
  });
  device.display.set(led.text, led.blink);
  refreshDisplay();
  const capsuleView = createCapsuleView(scene, capsules, plush);

  const meshes = new Map();
  function syncPrizes() {
    const seen = new Set();
    for (const p of sim.prizes) {
      seen.add(p.id);
      let m = meshes.get(p.id);
      if (!m) { m = plush.make(p.kind, p.color, p.r); scene.add(m); meshes.set(p.id, m); }
      m.position.set(p.x, p.y, p.z);
      m.rotation.set(p.tiltX, p.yaw, p.tiltZ);
    }
    for (const [id, m] of meshes) {
      if (!seen.has(id)) { scene.remove(m); meshes.delete(id); }   // geometry and materials are shared with the factory
    }
  }

  // A won toy waits behind the flap, then the door swings and hands it out.
  let doorOpen = 0;
  function stepBin(dt) {
    let wantOpen = 0;
    for (let i = binToys.length - 1; i >= 0; i--) {
      const b = binToys[i];
      b.t += dt;
      if (b.t > 2.4) {
        if (!b.opened) { b.opened = true; playSfx('release'); }
        wantOpen = 1;
        const p = Math.min(1, (b.t - 2.6) / 0.7);
        if (p > 0) {
          b.mesh.position.z = BIN.restZ + p * p * 3.6;
          b.mesh.scale.setScalar(b.r * (1 - p * p * 0.98));
        }
        if (p >= 1) { scene.remove(b.mesh); binToys.splice(i, 1); }
      }
    }
    doorOpen += (wantOpen - doorOpen) * Math.min(1, dt * (wantOpen ? 9 : 5));
  }

  // ---- camera: orbit plus smooth preset moves ----
  const controls = new OrbitControls(camera, canvas);
  controls.enablePan = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 12;
  controls.maxDistance = 110;
  controls.maxPolarAngle = 1.56;
  let activeView = 'whole';
  let tween = null;

  function viewPose(name) {
    const v = VIEWS[name];
    const tanH = Math.tan(THREE.MathUtils.degToRad(FOV) / 2);
    const portraitRoom = camera.aspect < 0.8 ? 1.07 : 1;   // leaves room for the title on phones
    const dist = Math.max((v.fit[1] / 2) / tanH, (v.fit[0] / 2) / (tanH * camera.aspect)) * portraitRoom;
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

  // ---- pointer input on the physical controls ----
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  function pick(e) {
    const rect = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects([...device.hitTargets, ...capsuleView.targets()], true);
    let found = null;
    for (const h of hits) {
      let o = h.object;
      while (o && !o.userData.hit) o = o.parent;
      if (!o) continue;
      const tag = o.userData.hit;
      if (tag === 'body') break;
      if (tag === 'capsule') return { tag, capId: o.userData.capId };
      if (!found) found = { tag };
    }
    return found;
  }
  let drag = null;
  function setStick(dx, dy) {
    const DEAD = 7;
    sim.hold('left', dx < -DEAD); sim.hold('right', dx > DEAD);
    sim.hold('forward', dy < -DEAD); sim.hold('back', dy > DEAD);
  }
  function onPointerDown(e) {
    const p = pick(e);
    if (!p) return;
    sfx.unlock();
    controls.enabled = false;           // this gesture belongs to the control, not the camera
    if (p.tag === 'joystick') {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      try { canvas.setPointerCapture(e.pointerId); } catch { /* not supported */ }
    } else if (p.tag === 'drop') {
      api.requestDrop();
    } else if (p.tag === 'pos') {
      api.tapCard();
    } else if (p.tag === 'capsule') {
      capsules.open(p.capId);
    } else if (p.tag === 'alcove') {
      capsules.open();
    }
  }
  function onPointerMove(e) {
    if (drag && e.pointerId === drag.id) { setStick(e.clientX - drag.x, e.clientY - drag.y); return; }
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      const p = pick(e);
      canvas.style.cursor = p ? (p.tag === 'joystick' ? 'grab' : 'pointer') : 'move';
    }
  }
  function onPointerUp(e) {
    if (drag && e.pointerId === drag.id) { drag = null; setStick(0, 0); }
    controls.enabled = true;
  }
  canvas.addEventListener('pointerdown', onPointerDown, { capture: true });
  canvas.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp);
  window.addEventListener('pointercancel', onPointerUp);

  // ---- loop ----
  let raf = 0;
  let alive = true;
  let last = performance.now();
  function tick(dt) {
    sim.update(dt);
    capsules.update(dt);
    pos.update(dt);
    gantry.update(sim.claw);
    syncPrizes();
    capsuleView.update(dt);
    stepBin(dt);
    device.update(dt, { input: sim.input, busy, credits, wheelAngle: capsules.mech.wheel, doorOpen, pos: pos.view });
    stepTween(dt);
    controls.update();
    renderer.render(scene, camera);
  }
  function frame(now) {
    if (!alive) return;
    tick(Math.min(1 / 30, Math.max(0, (now - last) / 1000))); last = now;
    raf = requestAnimationFrame(frame);
  }
  setView('whole', true);
  raf = requestAnimationFrame(frame);

  // Development only: step the game clock by hand (handy when the tab is in the
  // background and gets no animation frames). Stripped from production builds.
  if (import.meta.env.DEV) {
    window.__plushGrab = {
      advance(seconds) { for (let i = 0, n = Math.round(seconds * 60); i < n; i++) tick(1 / 60); last = performance.now(); },
      state() { return { ...sim.getState(), capsules: capsules.getState() }; },
      stats() { const { calls, triangles } = renderer.info.render; return { calls, triangles }; },
      // Screen position of a physical control, for driving it with pointer events in tests.
      where(tag) {
        const o = device.hitTargets.find((t) => t.userData.hit === tag);
        const v = o.getWorldPosition(new THREE.Vector3()).project(camera);
        const r = canvas.getBoundingClientRect();
        return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height };
      },
    };
  }

  const api = {
    hold(key, down) { sim.hold(key, down); if (down) sfx.unlock(); },
    requestDrop() {
      sfx.unlock();
      device.pressDrop();
      sim.requestDrop();
    },
    tapCard() { sfx.unlock(); return pos.tap(); },
    openCapsule(id) { sfx.unlock(); return capsules.open(id); },
    setView,
    setSkin,
    setMuted(m) { sfx.setMuted(m); },
    setMusic(on) { sfx.setMusic(on); },
    unlockAudio() { sfx.unlock(); },
    getState() { return { ...sim.getState(), capsules: capsules.getState() }; },
    destroy() {
      alive = false;
      if (import.meta.env.DEV && window.__plushGrab) delete window.__plushGrab;
      cancelAnimationFrame(raf);
      if (ro) ro.disconnect(); else window.removeEventListener('resize', resize);
      canvas.removeEventListener('pointerdown', onPointerDown, { capture: true });
      canvas.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerUp);
      controls.dispose();
      sim.destroy();
      capsules.destroy();
      capsuleView.destroy();
      sfx.destroy();
      for (const b of binToys) scene.remove(b.mesh);
      plush.dispose();
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
