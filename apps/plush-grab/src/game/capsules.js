// The always-win capsule bay built into the lower cabinet. A hopper of capsules
// feeds a gate wheel; every finished play turns the wheel half a turn, which
// drops one capsule down two ramps into the pickup alcove. Opening a capsule
// reveals the mini toy inside. No rendering and no DOM, so it runs headless.

import { KINDS } from './plush.js';
import { BAY } from './spec.js';

export const CAP_R = BAY.capR;
export const HOPPER = { x0: BAY.x0, x1: BAY.x1, z0: 2.45, z1: 3.85, top: -3.1 };
export const WHEEL = { x: 2.85, y: -5.35, r: 0.5, outer: 0.62 };
export const FUNNEL = { y: -5.15, slope: 0.45 };   // hopper floor height at the gate, and its rise per unit of x
export const TRAY = { y: BAY.trayY, z: BAY.trayZ };
export const SLOTS = [4.6, 3.98, 3.36, 2.74, 2.12]; // resting spots in the alcove, oldest first
export const SHELLS = ['#ff5fa2', '#2ad4bd', '#ffd23f', '#8f7bff', '#ff8c3a', '#58c4ff'];
export const MAX_WAITING = 4;
export const GATE_TIME = 1.0;
export const OPEN_TIME = 1.8;

// Capsule centre line from the wheel's bottom pocket to the alcove floor.
export const PATH = [
  { x: WHEEL.x, y: WHEEL.y - WHEEL.r },
  { x: WHEEL.x, y: -6.15 },   // drop onto ramp A
  { x: 4.55, y: -6.6 },       // roll along ramp A
  { x: 4.55, y: -7.1 },       // drop onto ramp B
  { x: 0.95, y: -7.8 },       // roll along ramp B
  { x: 0.95, y: TRAY.y },     // drop into the alcove
];

const HOPPER_START = 26, HOPPER_LOW = 12, HOPPER_REFILL = 14;
const GRAVITY = 14;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export function createCapsuleSim(handlers = {}) {
  const emit = (name, ...args) => { const h = handlers[name]; if (typeof h === 'function') h(...args); };
  const caps = [];
  const mech = { state: 'idle', t: 0, wheel: 0, wheelFrom: 0, cap: null };
  let nextId = 1, seq = 0, pending = 0, refillQueue = 0, refillTimer = 0;
  let lastTray = -1, signHold = 0;

  function status(text) { emit('onStatus', text); }
  function sign(text, blink = false) { emit('onSign', text, blink); }
  // Capsules the player can open: resting in the alcove, or shuffling along after reaching it once.
  function trayReady() { return caps.filter((c) => c.state === 'tray' || (c.state === 'roll' && c.arrived)).sort((a, b) => a.seq - b.seq); }
  function emitTray() { const n = trayReady().length; if (n !== lastTray) { lastTray = n; emit('onTray', n); } }
  function idleSign() {
    if (trayReady().length > 0) sign('TAP TO OPEN', true);
    else sign('EVERY PLAY WINS');
  }

  function makeCapsule(x, y, z) {
    const [kind, cols] = pick(KINDS);
    return {
      id: nextId++, kind, color: pick(cols), shell: pick(SHELLS),
      state: 'hopper', x, y, z, vx: 0, vy: 0, vz: 0,
      rx: rand(0, 6.28), ry: rand(0, 6.28), rz: rand(0, 6.28), roll: 0,
      t: 0, seq: 0, seg: 0, s: 0, v: 0, popped: false, arrived: false, from: null,
    };
  }

  // ---- hopper physics: spheres in a box whose floor slopes down to the gate ----
  function contain(c, dt) {
    const R = CAP_R;
    if (c.x < HOPPER.x0 + R) { c.x = HOPPER.x0 + R; c.vx = Math.abs(c.vx) * 0.3; }
    if (c.x > HOPPER.x1 - R) { c.x = HOPPER.x1 - R; c.vx = -Math.abs(c.vx) * 0.3; }
    if (c.z < HOPPER.z0 + R) { c.z = HOPPER.z0 + R; c.vz = Math.abs(c.vz) * 0.3; }
    if (c.z > HOPPER.z1 - R) { c.z = HOPPER.z1 - R; c.vz = -Math.abs(c.vz) * 0.3; }
    if (c.y > HOPPER.top - R) { c.y = HOPPER.top - R; c.vy = Math.min(0, c.vy); }
    const floor = FUNNEL.y + FUNNEL.slope * Math.abs(c.x - WHEEL.x) + R * 1.08;
    if (c.y < floor) {
      c.y = floor;
      if (c.vy < 0) c.vy = c.vy < -1 ? -c.vy * 0.25 : 0;
      c.vx -= Math.sign(c.x - WHEEL.x) * GRAVITY * FUNNEL.slope * dt;   // slide down the funnel
      c.vx *= 0.97; c.vz *= 0.9;
    }
  }
  function hopperPhysics(dt) {
    const list = caps.filter((c) => c.state === 'hopper');
    for (const c of list) {
      c.vy -= GRAVITY * dt;
      const k = Math.exp(-2.5 * dt);
      c.vx *= k; c.vz *= k;
      c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt;
      c.rx += c.vz * dt / CAP_R; c.rz -= c.vx * dt / CAP_R;
    }
    const min = CAP_R * 2;
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
          let d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d >= min) continue;
          if (d < 0.0001) { dx = 1; dy = 0; dz = 0; d = 1; }
          const nx = dx / d, ny = dy / d, nz = dz / d, push = (min - d) / 2;
          a.x -= nx * push; a.y -= ny * push; a.z -= nz * push;
          b.x += nx * push; b.y += ny * push; b.z += nz * push;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
          if (rel < 0) {
            const imp = -rel * 0.5;
            a.vx -= imp * nx; a.vy -= imp * ny; a.vz -= imp * nz;
            b.vx += imp * nx; b.vy += imp * ny; b.vz += imp * nz;
          }
        }
      }
      for (const c of list) contain(c, dt / 3);
    }
  }
  function fillHopper(n) {
    for (let i = 0; i < n; i++) {
      caps.push(makeCapsule(rand(HOPPER.x0 + 0.4, HOPPER.x1 - 0.4), rand(-4.6, HOPPER.top - 0.4), rand(HOPPER.z0 + 0.4, HOPPER.z1 - 0.4)));
    }
    for (let i = 0; i < 240; i++) hopperPhysics(1 / 60);
  }

  // ---- the gate: shake the hopper, then carry the capsule at the gate round the wheel ----
  function startGate() {
    pending--;
    if (caps.filter((c) => ['path', 'roll', 'tray'].includes(c.state)).length >= MAX_WAITING) {
      const oldest = trayReady()[0];
      if (oldest) startOpen(oldest, true);
    }
    mech.state = 'gate'; mech.t = 0; mech.wheelFrom = mech.wheel;
    status('Your bonus capsule is on its way…');
    signHold = 0;
    sign('BONUS CAPSULE!', true);
    emit('onSfx', 'crank');
    for (const c of caps) {
      if (c.state !== 'hopper') continue;
      c.vx += rand(-0.9, 0.9); c.vz += rand(-0.5, 0.5); c.vy += rand(0.5, 1.6);
    }
    const top = WHEEL.y + WHEEL.r;
    let best = null, score = Infinity;
    for (const c of caps) {
      if (c.state !== 'hopper') continue;
      const s = Math.hypot(c.x - WHEEL.x, c.y - top, (c.z - BAY.z) * 0.4);
      if (s < score) { score = s; best = c; }
    }
    if (!best) { best = makeCapsule(WHEEL.x, top, BAY.z); caps.push(best); }
    best.state = 'gate'; best.t = 0; best.from = { x: best.x, y: best.y, z: best.z };
    mech.cap = best;
  }
  function stepGate(dt) {
    mech.t += dt;
    const p = Math.min(1, mech.t / GATE_TIME);
    mech.wheel = mech.wheelFrom - easeInOut(p) * Math.PI;   // half a turn, clockwise from the front
    const c = mech.cap;
    const seat = Math.min(1, p / 0.3);
    if (seat < 1) {
      const e = easeInOut(seat);
      c.x = lerp(c.from.x, WHEEL.x, e);
      c.y = lerp(c.from.y, WHEEL.y + WHEEL.r, e);
      c.z = lerp(c.from.z, BAY.z, e);
    } else {
      const a = Math.PI / 2 - easeInOut((p - 0.3) / 0.7) * Math.PI;   // top of the wheel, round the right, to the bottom
      c.x = WHEEL.x + Math.cos(a) * WHEEL.r;
      c.y = WHEEL.y + Math.sin(a) * WHEEL.r;
      c.z = BAY.z;
      c.roll -= dt * 7;
    }
    if (p >= 1) {
      c.state = 'path'; c.seq = ++seq; c.seg = 0; c.s = 0; c.v = 0.5;
      mech.state = 'idle'; mech.cap = null;
    }
  }

  // ---- follow the ramps: gravity on the drops, gentle acceleration on the slopes ----
  function stepPath(c, dt) {
    const a = PATH[c.seg], b = PATH[c.seg + 1];
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    const falling = Math.abs(dx) < 0.001;
    c.v = Math.min(5.5, c.v + (falling ? GRAVITY : GRAVITY * 0.55 * (-dy / len)) * dt);
    c.s += c.v * dt;
    const prevX = c.x;
    const p = Math.min(1, c.s / len);
    c.x = lerp(a.x, b.x, p);
    c.y = lerp(a.y, b.y, p);
    if (c.seg === PATH.length - 2) c.z = lerp(BAY.z, TRAY.z, p);
    c.roll -= (c.x - prevX) / CAP_R;
    if (p >= 1) {
      const left = c.s - len;
      c.seg++; c.s = left;
      if (falling) { c.v *= 0.45; emit('onSfx', 'tick'); }
      if (c.seg >= PATH.length - 1) {
        c.state = 'roll'; c.vx = 1.8; c.x = b.x; c.y = TRAY.y; c.z = TRAY.z;
        emit('onSfx', 'capsuleDrop');
      }
    }
  }

  function lane() {
    return caps.filter((c) => ['path', 'roll', 'tray', 'open'].includes(c.state)).sort((a, b) => a.seq - b.seq);
  }
  function startOpen(c, auto = false) {
    c.state = 'open'; c.t = 0; c.popped = false;
    status(auto ? 'Alcove full, opening the oldest capsule…' : 'Opening…');
    if (mech.state === 'idle') sign('OPENING...');
    emitTray();
  }
  function open(id) {
    let c = id != null ? trayReady().find((k) => k.id === id) : null;
    if (!c) c = trayReady()[0];
    if (!c) return false;
    startOpen(c);
    return true;
  }

  function update(dt) {
    if (mech.state === 'idle' && pending > 0) startGate();
    if (mech.state === 'gate') stepGate(dt);

    hopperPhysics(dt);

    if (refillQueue === 0 && caps.filter((c) => c.state === 'hopper').length < HOPPER_LOW) refillQueue = HOPPER_REFILL;
    if (refillQueue > 0) {
      refillTimer -= dt;
      if (refillTimer <= 0) {
        refillTimer = 0.14; refillQueue--;
        caps.push(makeCapsule(rand(HOPPER.x0 + 0.5, HOPPER.x1 - 0.5), HOPPER.top - 0.4, rand(HOPPER.z0 + 0.4, HOPPER.z1 - 0.4)));
      }
    }

    if (signHold > 0) { signHold -= dt; if (signHold <= 0) idleSign(); }

    const order = lane();
    for (let i = 0; i < order.length; i++) {
      const c = order[i];
      const target = SLOTS[Math.min(i, SLOTS.length - 1)];
      if (c.state === 'path') stepPath(c, dt);
      else if (c.state === 'tray' && Math.abs(target - c.x) > 0.01) c.state = 'roll';
      if (c.state === 'roll') {
        const acc = (target - c.x) * 11 - c.vx * 5.2;   // spring to the slot with a little bounce
        c.vx = clamp(c.vx + acc * dt, -4, 4);
        c.x += c.vx * dt;
        c.roll -= c.vx * dt / CAP_R;
        if (Math.abs(target - c.x) < 0.01 && Math.abs(c.vx) < 0.05) {
          c.x = target; c.vx = 0; c.state = 'tray';
          if (!c.arrived) {
            c.arrived = true;
            const n = trayReady().length;
            status(n === 1 ? 'Bonus capsule! Tap it to open.' : `${n} capsules waiting. Tap one to open.`);
            emitTray();
            if (signHold <= 0) sign('TAP TO OPEN', true);
          }
        }
      }
      if (c.state === 'open') {
        c.t += dt;
        if (!c.popped && c.t >= 0.45) { c.popped = true; emit('onSfx', 'pop'); }
        if (c.t >= OPEN_TIME) {
          caps.splice(caps.indexOf(c), 1);
          emit('onOpened', { id: 'c' + c.id, kind: c.kind, color: c.color, shell: c.shell, size: 'capsule' });
          status(`Mini ${c.kind}! It's on your prize shelf.`);
          sign(`MINI ${c.kind.toUpperCase()}!`);
          signHold = 1.8;
          emitTray();
        }
      }
    }
  }

  function dispense() { pending++; }
  function getState() {
    return {
      hopper: caps.filter((c) => c.state === 'hopper').length,
      lane: lane().map((c) => ({ id: c.id, state: c.state, kind: c.kind, x: c.x })),
      tray: trayReady().length,
      mech: mech.state,
      pending,
    };
  }

  fillHopper(HOPPER_START);
  status('Every play drops a bonus capsule.');
  sign('EVERY PLAY WINS');
  emitTray();

  return { caps, mech, update, dispense, open, trayReady, getState, destroy() {} };
}
