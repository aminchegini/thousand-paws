// The arcade as one Three.js model: the counter cabinet with its LED display and dome
// button, the bear shelf beside it, and the room they stand in. buildArcade(scene, palette)
// builds it in one skin's colours and returns the moving parts and the pointer targets.

import * as THREE from 'three';
import { rbox, sphere, std, at, canvasPlane, canvasTexture, label, makeLed, makeTeddy, disposeObject } from '@paws/arcade-kit';
import { BEARS } from './spec.js';

export const CAB_X = -5;
export const SHELF_X = 5.4;
const ROWS = [8.0, 3.4];                 // top faces of the two shelves, upper row first
const COLS = [-3.45, -1.15, 1.15, 3.45];
const BEAR_SCALE = 1.5;
const CAP_Y = 7.95;
const CONFETTI = 160;

const solid = (mesh) => { mesh.castShadow = true; mesh.receiveShadow = true; return mesh; };

function buildRoom(root, PALETTE) {
  const floorTex = canvasTexture(512, 512, (x, w, h) => {
    x.fillStyle = PALETTE.floor; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      x.fillStyle = PALETTE.floorDots[i % PALETTE.floorDots.length];
      x.beginPath(); x.arc((i * 197) % w, (i * 311) % h, 5 + (i % 4) * 3, 0, Math.PI * 2); x.fill();
    }
  }, true);
  floorTex.redraw(); floorTex.tex.repeat.set(10, 10);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(140, 140), new THREE.MeshStandardMaterial({ map: floorTex.tex, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;

  const wallTex = canvasTexture(256, 256, (x, w, h) => {
    x.fillStyle = PALETTE.wall; x.fillRect(0, 0, w, h);
    x.fillStyle = PALETTE.wallStripe;
    for (let i = 0; i < w; i += w / 8) x.fillRect(i, 0, w / 16, h);
  }, true);
  wallTex.redraw(); wallTex.tex.repeat.set(12, 1);
  const wall = new THREE.Mesh(new THREE.PlaneGeometry(140, 44), new THREE.MeshStandardMaterial({ map: wallTex.tex, roughness: 1 }));
  wall.position.set(0, 22, -4.2); wall.receiveShadow = true;
  root.add(floor, wall);
}

function drawPaw(color, x, w, h) {
  x.fillStyle = color;
  const pad = (cx, cy, rx, ry) => { x.beginPath(); x.ellipse(cx * w, cy * h, rx * w, ry * h, 0, 0, Math.PI * 2); x.fill(); };
  pad(0.5, 0.64, 0.22, 0.19);
  pad(0.22, 0.38, 0.085, 0.11); pad(0.4, 0.24, 0.085, 0.11); pad(0.6, 0.24, 0.085, 0.11); pad(0.78, 0.38, 0.085, 0.11);
}

function buildCabinet(hitTargets, PALETTE) {
  const group = new THREE.Group(); group.position.x = CAB_X;
  const body = std(PALETTE.body, { roughness: 0.32 });
  const trim = std(PALETTE.trim, { roughness: 0.4 });
  const dark = std(PALETTE.deck, { roughness: 0.55 });
  const plate = { color: PALETTE.tagText, bg: PALETTE.tagBg };

  group.add(solid(at(rbox(6, 7, 4.4, body, 0.25), 0, 3.5, 0)));               // base
  group.add(at(canvasPlane(3.2, 3.2, (x, w, h) => drawPaw(PALETTE.paw, x, w, h), { px: 256, transparent: true }).mesh, 0, 3.6, 2.21));
  group.add(solid(at(rbox(6.6, 0.6, 5.2, trim, 0.2), 0, 7.3, 0.3)));          // control deck
  group.add(at(label(3.6, 0.44, 'STOP AT 1000', { ...plate, scale: 0.66 }), 0, 7.3, 2.91));
  group.add(solid(at(rbox(6, 6.4, 1.8, body, 0.25), 0, 10.6, -1.3)));         // display tower
  group.add(at(rbox(5.4, 2.9, 0.3, dark, 0.12), 0, 10.4, -0.36));             // display bezel

  const display = makeLed(4.9, 2.4, { color: PALETTE.led, dim: PALETTE.ledDim, twoLines: true });
  group.add(at(display.mesh, 0, 10.4, -0.2));

  group.add(solid(at(rbox(6.6, 1.9, 2.2, trim, 0.2), 0, 14.6, -1.1)));        // marquee
  group.add(at(label(5.9, 1.3, 'THOUSAND PAWS', { ...plate, font: '400 %px Bungee, "Arial Black", Impact, sans-serif', scale: 0.6 }), 0, 14.6, 0.01));
  const bulbs = PALETTE.bulbs.map((color, i) => {
    const bulb = sphere(0.17, std(color, { roughness: 0.3, emissive: color, emissiveIntensity: 0.5 }), 14);
    group.add(at(bulb, -2.7 + i * 0.9, 13.42, -0.25));
    return bulb;
  });

  // the dome button, on its collar
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 0.4, 40), dark);
  const buttonMat = std(PALETTE.button, { roughness: 0.28, emissive: PALETTE.buttonGlow, emissiveIntensity: 0.5 });
  const cap = new THREE.Mesh(new THREE.SphereGeometry(1.05, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2), buttonMat);
  cap.scale.y = 0.6; cap.castShadow = true;
  for (const part of [collar, cap]) { part.userData.hit = 'button'; hitTargets.push(part); }
  group.add(at(collar, 0, 7.8, 1.1), at(cap, 0, CAP_Y, 1.1));

  return { group, display, bulbs, cap, buttonMat };
}

function makeLock(PALETTE) {
  const g = new THREE.Group();
  const gold = std(PALETTE.lock, { roughness: 0.35, metalness: 0.6 });
  const shackle = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.045, 10, 20, Math.PI), gold);
  shackle.position.y = 0.2;
  g.add(rbox(0.5, 0.4, 0.18, gold, 0.06), shackle);
  return g;
}

function buildShelf(PALETTE) {
  const group = new THREE.Group(); group.position.x = SHELF_X;
  const wood = std(PALETTE.wood, { roughness: 0.7 });
  const woodDark = std(PALETTE.woodDark, { roughness: 0.8 });
  group.add(solid(at(rbox(10.2, 12.8, 0.3, woodDark, 0.08), 0, 6.4, -1.35)));
  for (const s of [-1, 1]) group.add(solid(at(rbox(0.4, 12.8, 3, wood, 0.08), s * 5.1, 6.4, 0)));
  for (const y of [...ROWS, 12.8]) group.add(solid(at(rbox(10.2, 0.35, 3, wood, 0.08), 0, y - 0.175, 0)));

  const slots = new Map();
  BEARS.forEach((bear, i) => {
    const x = COLS[i % COLS.length], y = ROWS[Math.floor(i / COLS.length)];
    const teddy = makeTeddy(PALETTE.bear(bear));
    const yaw = ((i * 7) % 5 - 2) * 0.07;
    teddy.group.scale.setScalar(BEAR_SCALE);
    teddy.group.rotation.y = yaw;
    const slot = new THREE.Group(); slot.position.set(x, y, 0.1);
    const lock = at(makeLock(PALETTE), 0, 1.2, 1.02);
    const tag = label(2.1, 0.42, bear.name.toUpperCase(), { color: PALETTE.tagText, bg: PALETTE.tagBg, scale: 0.6 });
    slot.add(teddy.group, lock, at(tag, 0, -0.175, 1.42));
    group.add(slot);
    slots.set(bear.id, { teddy, bear: teddy.group, lock, tag, yaw, slot });
  });
  return { group, slots };
}

function makeConfetti(root, PALETTE) {
  const mesh = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(0.26, 0.16),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, toneMapped: false }),
    CONFETTI,
  );
  mesh.frustumCulled = false; mesh.visible = false;
  const bits = Array.from({ length: CONFETTI }, () => ({
    p: new THREE.Vector3(), v: new THREE.Vector3(), spin: new THREE.Vector3(), rot: new THREE.Euler(),
  }));
  const color = new THREE.Color(), m = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  bits.forEach((_, i) => mesh.setColorAt(i, color.set(PALETTE.confetti[i % PALETTE.confetti.length])));
  mesh.instanceColor.needsUpdate = true;
  root.add(mesh);
  const any = (span) => (Math.random() - 0.5) * span;
  let life = 0;
  return {
    burst(x, y, z) {
      life = 3.4; mesh.visible = true;
      for (const b of bits) {
        const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 6;
        b.p.set(x + any(2), y, z + any(1));
        b.v.set(Math.cos(a) * s, 5 + Math.random() * 7, Math.sin(a) * s * 0.5 + 1.5);
        b.spin.set(any(9), any(9), any(9));
        b.rot.set(any(6), any(6), any(6));
      }
    },
    update(dt) {
      if (life <= 0) return;
      life -= dt;
      if (life <= 0) { mesh.visible = false; return; }
      bits.forEach((b, i) => {
        b.v.y -= 14 * dt;
        b.v.multiplyScalar(1 - 0.9 * dt);
        b.p.addScaledVector(b.v, dt);
        if (b.p.y < 0.05) { b.p.y = 0.05; b.v.set(0, 0, 0); b.spin.set(0, 0, 0); }
        b.rot.x += b.spin.x * dt; b.rot.y += b.spin.y * dt; b.rot.z += b.spin.z * dt;
        mesh.setMatrixAt(i, m.compose(b.p, q.setFromEuler(b.rot), one));
      });
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

export function buildArcade(scene, PALETTE) {
  const root = new THREE.Group();
  scene.add(root);
  const hitTargets = [];
  buildRoom(root, PALETTE);
  const cabinet = buildCabinet(hitTargets, PALETTE);
  const shelf = buildShelf(PALETTE);
  root.add(cabinet.group, shelf.group);
  const confetti = makeConfetti(root, PALETTE);

  let press = 0;
  let clock = 0;
  const hops = new Map();   // bear id -> seconds since it was won

  return {
    root,
    hitTargets,
    display: cabinet.display,
    pressButton() { press = 1; },
    resetClock() { clock = 0; },
    // Removes the model, so the arcade can be rebuilt in another skin.
    dispose() { scene.remove(root); disposeObject(root); },
    setUnlocked(ids) {
      for (const [id, s] of shelf.slots) {
        const locked = !ids.includes(id);
        s.teddy.setLocked(locked);
        s.lock.visible = locked;
        s.tag.userData.restyle({ color: locked ? PALETTE.tagLocked : PALETTE.tagText });
      }
    },
    // A won bear hops on its shelf under a burst of confetti. With no bear left to
    // win, the confetti falls over the cabinet instead.
    celebrate(id, { confetti: wantConfetti = true } = {}) {
      const s = shelf.slots.get(id);
      if (s) hops.set(id, 0);
      if (!wantConfetti) return;
      if (s) confetti.burst(SHELF_X + s.slot.position.x, s.slot.position.y + 4.2, 1.4);
      else confetti.burst(CAB_X, 15.5, 1);
    },
    update(dt, { phase }) {
      clock += dt;
      cabinet.display.tick(dt);
      press = Math.max(0, press - dt * 5);
      cabinet.cap.position.y = CAP_Y - 0.24 * press;
      cabinet.buttonMat.emissiveIntensity = phase === 'running' ? 1.1 : 0.55 + 0.45 * Math.sin(clock * 4);
      const chase = Math.floor(clock * 3) % cabinet.bulbs.length;
      cabinet.bulbs.forEach((b, i) => {
        b.material.emissiveIntensity = phase === 'won' ? 0.6 + 0.9 * Math.abs(Math.sin(clock * 9 + i)) : (i === chase ? 1.6 : 0.5);
      });
      for (const [id, t] of hops) {
        const s = shelf.slots.get(id), n = t + dt, done = n > 3;
        s.bear.position.y = done ? 0 : Math.abs(Math.sin(n * 8)) * 0.9 * Math.exp(-n * 1.5);
        s.bear.scale.setScalar(BEAR_SCALE * (done ? 1 : 1 + 0.18 * Math.exp(-n * 2.2)));
        s.bear.rotation.y = s.yaw + (done ? 0 : Math.sin(n * 6) * 0.35 * Math.exp(-n * 1.4));
        if (done) hops.delete(id); else hops.set(id, n);
      }
      confetti.update(dt);
    },
  };
}
