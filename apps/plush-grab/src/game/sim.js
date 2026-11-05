// The claw machine simulation: a 3D pit of plush spheres, the claw's state
// machine, credits and outcomes. No rendering and no DOM, so it runs headless.
// Units are metres-ish; +y is up, +z is toward the player, x runs left to right.

import { KINDS } from './plush.js';
import { BIN } from './spec.js';

export const HALF_W = 5;          // pit half-width (x)
export const HALF_D = 3.5;        // pit half-depth (z)
export const CAB_H = 8;           // cabinet interior height
export const CHUTE_W = 2.4;
export const CHUTE_D = 2.4;
export const WALL_T = 0.22;       // divider wall thickness
export const WALL_H = 2.1;        // teal divider wall height
export const SHIELD_H = 4.0;      // clear acrylic shield on top of the divider
export const CX_EDGE = -HALF_W + CHUTE_W;   // chute occupies x < CX_EDGE ...
export const CZ_EDGE = HALF_D - CHUTE_D;    // ... and z > CZ_EDGE (front-left corner)
export const CHUTE_X = -HALF_W + CHUTE_W / 2;
export const CHUTE_Z = HALF_D - CHUTE_D / 2;
export const RAIL_Y = 7.5;        // gantry height
export const REST_Y = 6.3;        // claw head height while travelling
export const PRONG = 1.3;         // prong length below the head
export const MAX_Y = PRONG + 0.12;
export const PLAY = { minX: -HALF_W + 0.9, maxX: HALF_W - 0.9, minZ: -HALF_D + 0.9, maxZ: HALF_D - 0.9 };
export const HOME = { x: 0.8, z: 0 };
export const START_PRIZES = 70;

// Toy sizes. Bigger toys are easier to land on, but the claw catches and
// holds them less reliably; small ones are a tight target but rarely slip.
export const SIZES = [
  { name: 'small', r: [0.36, 0.44], weight: 0.3, catchMul: 1.0, grip: [0.6, 1.0] },
  { name: 'medium', r: [0.54, 0.62], weight: 0.4, catchMul: 1.0, grip: [0.5, 1.0] },
  { name: 'large', r: [0.72, 0.8], weight: 0.22, catchMul: 0.9, grip: [0.4, 0.95] },
  { name: 'jumbo', r: [0.94, 1.0], weight: 0.08, catchMul: 0.7, grip: [0.3, 0.85] },
];
const SIZE_BY_NAME = Object.fromEntries(SIZES.map((sz) => [sz.name, sz]));
const RESTOCK = 14;

const SPEED = 3.2, DESCEND = 3.6, RISE = 3.0, RETURN = 3.4;
const GRAVITY = 24;

const rand = (a, b) => a + Math.random() * (b - a);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function inChuteRegion(x, z) { return x < CX_EDGE && z > CZ_EDGE; }

function pickSize() {
  let t = Math.random();
  for (const sz of SIZES) { t -= sz.weight; if (t < 0) return sz; }
  return SIZES[1];
}

export function createSim(handlers = {}) {
  const emit = (name, ...args) => { const h = handlers[name]; if (typeof h === 'function') h(...args); };
  const sfx = (name) => emit('onSfx', name);

  let credits = Number.isFinite(handlers.initialCredits) ? handlers.initialCredits : 5;
  let nextId = 1;
  const prizes = [];
  let settling = false;
  let restockQueue = 0;
  let restockTimer = 0;
  const startCount = Number.isFinite(handlers.startPrizes) ? handlers.startPrizes : START_PRIZES;
  let creditTimer = 0;
  let alive = true;
  let motorOn = false;
  let dropQueued = false;

  const claw = {
    cx: HOME.x, cz: HOME.z,            // carriage (where the cable hangs from)
    x: HOME.x, y: REST_Y, z: HOME.z,   // claw head
    open: 1, openTarget: 1, openFrom: 1,
    state: 'idle', t: 0,
    vx: 0, vz: 0, lastVx: 0, lastVz: 0,
    swX: 0, swZ: 0, swVX: 0, swVZ: 0,  // cable swing offsets and velocities
    held: null, grip: 0, candidate: null, result: '',
  };
  const input = { left: false, right: false, forward: false, back: false };

  // ---- UI events ----
  function led(text, blink = false) { emit('onLed', text, !!blink); }
  function readyLed() { if (credits > 0) led('READY · AIM'); else led('TAP CARD TO PLAY', true); }
  function setCredits(n) { credits = n; emit('onCredits', n); }
  function setState(s) { claw.state = s; emit('onBusy', s !== 'idle'); }

  // ---- prizes ----
  // Spawn spot well clear of the chute; restocked toys also keep clear of the claw.
  function spawnXZ(fromTop) {
    for (let tries = 0; tries < 30; tries++) {
      const x = rand(-HALF_W + 0.8, HALF_W - 0.8), z = rand(-HALF_D + 0.8, HALF_D - 0.8);
      if (x < CX_EDGE + 1.2 && z > CZ_EDGE - 1.2) continue;
      if (fromTop && Math.hypot(x - claw.cx, z - claw.cz) < 1.4) continue;
      return [x, z];
    }
    return [HALF_W - 1.2, -HALF_D + 1.2];
  }
  function makePrize(fromTop = false) {
    const [kind, cols] = pick(KINDS);
    const size = pickSize();
    const [x, z] = spawnXZ(fromTop);
    return {
      id: nextId++, kind, color: pick(cols), size: size.name,
      x, y: fromTop ? rand(6.3, 6.9) : rand(1, 7), z, r: rand(size.r[0], size.r[1]),
      vx: 0, vy: 0, vz: 0,
      yaw: rand(-0.7, 0.7), tiltX: rand(-0.2, 0.2), tiltZ: rand(-0.2, 0.2),
      held: false, wasHeld: false, heldOff: 0,
    };
  }
  function stepPrizes(dt) {
    for (const p of prizes) {
      if (p.held) continue;
      p.vy -= GRAVITY * dt;
      const damp = Math.exp(-5 * dt);
      p.vx *= damp; p.vz *= damp;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      p.yaw += p.vx * dt * 0.3;
    }
    for (let it = 0; it < 3; it++) {
      for (let i = 0; i < prizes.length; i++) {
        const a = prizes[i]; if (a.held) continue;
        for (let j = i + 1; j < prizes.length; j++) {
          const b = prizes[j]; if (b.held) continue;
          let dx = b.x - a.x, dy = b.y - a.y, dz = b.z - a.z;
          let d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const min = a.r + b.r;
          if (d >= min) continue;
          if (d < 0.0001) { dx = 1; dy = 0; dz = 0; d = 1; }
          const nx = dx / d, ny = dy / d, nz = dz / d, push = (min - d) / 2;
          a.x -= nx * push; a.y -= ny * push; a.z -= nz * push;
          b.x += nx * push; b.y += ny * push; b.z += nz * push;
          const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny + (b.vz - a.vz) * nz;
          if (rel < 0) {
            const imp = -rel * 0.55;
            a.vx -= imp * nx; a.vy -= imp * ny; a.vz -= imp * nz;
            b.vx += imp * nx; b.vy += imp * ny; b.vz += imp * nz;
          }
        }
      }
      constrain();
    }
  }
  function constrain() {
    for (let k = prizes.length - 1; k >= 0; k--) {
      const p = prizes[k]; if (p.held) continue;
      const r = p.r;
      if (p.x < -HALF_W + r) { p.x = -HALF_W + r; p.vx = Math.abs(p.vx) * 0.3; }
      if (p.x > HALF_W - r) { p.x = HALF_W - r; p.vx = -Math.abs(p.vx) * 0.3; }
      if (p.z < -HALF_D + r) { p.z = -HALF_D + r; p.vz = Math.abs(p.vz) * 0.3; }
      if (p.z > HALF_D - r) { p.z = HALF_D - r; p.vz = -Math.abs(p.vz) * 0.3; }
      // Toys the claw never carried can't climb over the shield, so the pile never spills into the chute.
      const belowWallTop = p.y - r < (p.wasHeld ? SHIELD_H : Infinity);
      if (inChuteRegion(p.x, p.z)) {
        if (belowWallTop) {
          const maxX = CX_EDGE - WALL_T / 2 - r;
          if (p.x > maxX) { p.x = maxX; p.vx = -Math.abs(p.vx) * 0.3; }
          const minZ = CZ_EDGE + WALL_T / 2 + r;
          if (p.z < minZ) { p.z = minZ; p.vz = Math.abs(p.vz) * 0.3; }
        }
        if (p.y - p.r < BIN.floorY) { prizes.splice(k, 1); if (!settling) onWin(p); }   // landed in the bin behind the prize door
      } else {
        if (belowWallTop) {
          const penX = (CX_EDGE + WALL_T / 2) - (p.x - r);
          const penZ = (p.z + r) - (CZ_EDGE - WALL_T / 2);
          if (penX > 0 && penZ > 0) {
            if (penX < penZ) { p.x += penX; p.vx = Math.abs(p.vx) * 0.3; }
            else { p.z -= penZ; p.vz = -Math.abs(p.vz) * 0.3; }
          }
        }
        if (p.y < r) { p.y = r; p.vy = p.vy < -2 ? -p.vy * 0.22 : 0; p.vx *= 0.9; p.vz *= 0.9; }
      }
    }
  }
  function fillPit(n) {
    settling = true;
    for (let i = 0; i < n; i++) prizes.push(makePrize());
    for (let i = 0; i < 300; i++) stepPrizes(1 / 60);
    settling = false;
  }
  function onWin(p) {
    emit('onWon', { id: p.id, kind: p.kind, color: p.color, size: p.size, r: p.r });
    led(p.size === 'jumbo' ? 'JUMBO PRIZE!' : 'PRIZE WON!');
    sfx('win');
    if (prizes.length + restockQueue < startCount - RESTOCK) restockQueue += RESTOCK;
  }

  // ---- claw ----
  function moveCarriage(dt, tx, tz, speed) {
    const dx = tx - claw.cx, dz = tz - claw.cz, d = Math.hypot(dx, dz), step = speed * dt;
    if (d <= step) { claw.cx = tx; claw.cz = tz; claw.vx = 0; claw.vz = 0; return true; }
    claw.cx += (dx / d) * step; claw.cz += (dz / d) * step;
    claw.vx = (dx / d) * speed; claw.vz = (dz / d) * speed;
    return false;
  }
  const horiz = (p) => Math.hypot(p.x - claw.x, p.z - claw.z);
  function findCandidate() {
    const tipY = claw.y - PRONG;
    let best = null, bd = 1e9;
    for (const p of prizes) {
      if (p.held) continue;
      const d = horiz(p);
      if (d < p.r * 0.95 && Math.abs(p.y - tipY) < p.r * 1.15 && d < bd) { bd = d; best = p; }
    }
    return best;
  }
  function resolveGrab() {
    const p = claw.candidate; claw.candidate = null;
    if (!p) { claw.result = 'empty'; led('EMPTY CLAW'); return; }
    const size = SIZE_BY_NAME[p.size];
    const off = horiz(p) / p.r;
    const chance = (0.9 - 0.65 * off) * size.catchMul;   // dead centre 90%, edge grab about 30%, less for big toys
    if (Math.random() < chance) {
      p.held = true; p.wasHeld = true; p.heldOff = claw.y - p.y;
      claw.held = p; claw.grip = rand(size.grip[0], size.grip[1]); claw.result = 'caught';
      led(p.size === 'jumbo' ? 'JUMBO! HOLD TIGHT' : 'GOT ONE · HOLD TIGHT');
    } else {
      claw.result = 'miss'; led('SO CLOSE');
    }
  }
  function slipCheck(dt) {
    if (!claw.held) return;
    const rate = (1 - claw.grip) * 0.32;         // weak grips shed the prize on the way back
    if (Math.random() < rate * dt) {
      const p = claw.held; p.held = false; claw.held = null;
      p.vy = -0.5; p.vx = rand(-1, 1); p.vz = rand(-1, 1);
      claw.result = 'slip'; led('IT SLIPPED'); sfx('slip');
    }
  }

  // How far below the claw head a held toy's centre sits: on the prong tips for
  // small toys, tucked up under the head for big ones (prong geometry lives in scene.js).
  function heldDepth(p) {
    const th = 0.1 + 0.8 * claw.open;
    const tipDepth = 0.12 + PRONG * Math.cos(th) - 0.1 * Math.sin(th);
    return Math.max(tipDepth - 0.45 * p.r, 0.2 + p.r);
  }

  function update(dt) {
    claw.vx = 0; claw.vz = 0;
    switch (claw.state) {
      case 'idle': {
        const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
        const dz = (input.back ? 1 : 0) - (input.forward ? 1 : 0);
        if ((dx || dz) && credits > 0 && dt > 0) {
          const nx = clamp(claw.cx + dx * SPEED * dt, PLAY.minX, PLAY.maxX);
          const nz = clamp(claw.cz + dz * SPEED * dt, PLAY.minZ, PLAY.maxZ);
          claw.vx = (nx - claw.cx) / dt; claw.vz = (nz - claw.cz) / dt;
          claw.cx = nx; claw.cz = nz;
        }
        if (dropQueued) {
          dropQueued = false;
          if (credits > 0) { setCredits(credits - 1); setState('descending'); claw.result = ''; led('GOING DOWN'); sfx('drop'); }
        }
        break;
      }
      case 'descending': {
        claw.y -= DESCEND * dt;
        const tipY = claw.y - PRONG;
        let hit = claw.y <= MAX_Y;
        for (const p of prizes) {
          if (!p.held && horiz(p) < p.r * 0.9 && tipY <= p.y + p.r * 0.3) { hit = true; break; }
        }
        if (hit) {
          claw.y = Math.max(claw.y, MAX_Y);
          setState('closing'); claw.t = 0;
          claw.candidate = findCandidate();
          claw.openTarget = claw.candidate ? clamp(0.85 * claw.candidate.r - 0.16, 0.15, 0.7) : 0.02;   // wrap the prongs around the toy
          sfx('grab');
        }
        break;
      }
      case 'closing': {
        claw.t += dt;
        claw.open = 1 - (1 - claw.openTarget) * easeOut(Math.min(1, claw.t / 0.4));
        if (claw.t >= 0.6) { resolveGrab(); setState('rising'); }
        break;
      }
      case 'rising': {
        claw.y += RISE * dt;
        if (!claw.held) claw.open += (0.02 - claw.open) * Math.min(1, dt * 6);
        slipCheck(dt);
        if (claw.y >= REST_Y) { claw.y = REST_Y; setState('returning'); }
        break;
      }
      case 'returning': {
        if (!claw.held) claw.open += (0.02 - claw.open) * Math.min(1, dt * 6);
        slipCheck(dt);
        if (moveCarriage(dt, CHUTE_X, CHUTE_Z, RETURN)) { setState('releasing'); claw.t = 0; claw.openFrom = claw.open; sfx('release'); }
        break;
      }
      case 'releasing': {
        claw.t += dt;
        claw.open = claw.openFrom + (1 - claw.openFrom) * easeOut(Math.min(1, claw.t / 0.4));
        if (claw.held && claw.t >= 0.15) {
          const p = claw.held; p.held = false; claw.held = null;
          p.vy = -1; p.vx = claw.swVX * 0.3; p.vz = claw.swVZ * 0.3;
          led('INTO THE CHUTE');
        }
        if (claw.t >= 1.0) { setState('homing'); if (claw.result !== 'caught') sfx('miss'); }
        break;
      }
      case 'homing': {
        if (moveCarriage(dt, HOME.x, HOME.z, RETURN)) { setState('idle'); claw.open = 1; readyLed(); emit('onPlayEnd', claw.result); }
        break;
      }
      default:
    }

    // cable swing: a kick whenever the carriage speed changes, then a damped spring on each axis
    const dvx = claw.vx - claw.lastVx, dvz = claw.vz - claw.lastVz;
    claw.lastVx = claw.vx; claw.lastVz = claw.vz;
    claw.swVX -= dvx * 0.4; claw.swVZ -= dvz * 0.4;
    claw.swVX += (-claw.swX * 40 - claw.swVX * 3.5) * dt;
    claw.swVZ += (-claw.swZ * 40 - claw.swVZ * 3.5) * dt;
    claw.swX = clamp(claw.swX + claw.swVX * dt, -0.45, 0.45);
    claw.swZ = clamp(claw.swZ + claw.swVZ * dt, -0.45, 0.45);
    claw.x = claw.cx + claw.swX; claw.z = claw.cz + claw.swZ;

    if (claw.held) {
      const p = claw.held;
      p.heldOff += (heldDepth(p) - p.heldOff) * Math.min(1, dt * 8);
      p.x = claw.x; p.z = claw.z; p.y = claw.y - p.heldOff;
      p.vx = 0; p.vy = 0; p.vz = 0;
      p.tiltZ += ((claw.swX * 0.5) - p.tiltZ) * Math.min(1, dt * 5);
      p.tiltX += ((-claw.swZ * 0.5) - p.tiltX) * Math.min(1, dt * 5);
    }
    stepPrizes(dt);
    if (restockQueue > 0) {
      restockTimer -= dt;
      if (restockTimer <= 0) { restockTimer = 0.12; restockQueue--; prizes.push(makePrize(true)); }
    }

    const moving = claw.state === 'descending' || claw.state === 'rising' || claw.state === 'returning' || claw.state === 'homing' || claw.vx !== 0 || claw.vz !== 0;
    if (moving !== motorOn) { motorOn = moving; emit('onMotor', moving); }
  }

  // ---- actions ----
  function requestDrop() {
    if (claw.state !== 'idle') return;
    if (credits <= 0) { led('TAP CARD TO PLAY', true); sfx('buzz'); return; }
    dropQueued = true;
  }
  function addCredit() {
    if (credits >= 99) return;
    setCredits(credits + 1);
    if (claw.state === 'idle') {
      led('CREDIT ADDED');
      clearTimeout(creditTimer);
      creditTimer = setTimeout(() => { if (alive && claw.state === 'idle') readyLed(); }, 700);
    }
  }
  function hold(key, down) { if (key in input) input[key] = !!down; }
  function getState() {
    return {
      state: claw.state, x: claw.x, y: claw.y, z: claw.z, open: claw.open, credits,
      holding: claw.held ? claw.held.id : null,
      prizes: prizes.map((p) => ({ id: p.id, kind: p.kind, size: p.size, x: p.x, y: p.y, z: p.z, r: p.r, held: p.held, wasHeld: p.wasHeld })),
    };
  }
  function destroy() { alive = false; clearTimeout(creditTimer); }

  fillPit(startCount);
  emit('onCredits', credits);
  readyLed();

  return { prizes, claw, input, update, hold, requestDrop, addCredit, getState, destroy };
}
