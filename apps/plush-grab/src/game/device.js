// The whole machine as one 3D model: plinth, lower cabinet with the prize door and
// the built-in capsule bay, control panel with joystick, drop button, POS card reader and
// display, glass playfield, lit marquee and rear service panel. Dimensions come from
// spec.js and sim.js. buildDevice(scene) returns the moving parts and pointer targets.

import * as THREE from 'three';
import { rbox, at, canvasPlane, canvasTexture, label, makeLed } from '@paws/arcade-kit';
import {
  HALF_W, HALF_D, CAB_H, CHUTE_W, CHUTE_D, CX_EDGE, CZ_EDGE, CHUTE_X, CHUTE_Z,
  WALL_T, WALL_H, SHIELD_H, RAIL_Y,
} from './sim.js';
import { GROUND_Y, SHELL, PANEL, BIN, BAY, POS } from './spec.js';
import { POS_TIMES } from './pos.js';
import { SKINS, drawWood } from './skins.js';
import { HOPPER, WHEEL, FUNNEL, PATH, CAP_R } from './capsules.js';

const std = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });
const glow = (color, intensity = 1.6) => new THREE.MeshStandardMaterial({ color: 0x111111, emissive: color, emissiveIntensity: intensity, roughness: 0.5 });
const box = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);

function rectInto(path, x0, y0, x1, y1, r) {
  path.moveTo(x0 + r, y0);
  path.lineTo(x1 - r, y0); path.quadraticCurveTo(x1, y0, x1, y0 + r);
  path.lineTo(x1, y1 - r); path.quadraticCurveTo(x1, y1, x1 - r, y1);
  path.lineTo(x0 + r, y1); path.quadraticCurveTo(x0, y1, x0, y1 - r);
  path.lineTo(x0, y0 + r); path.quadraticCurveTo(x0, y0, x0 + r, y0);
  return path;
}

function setFinish(m, p, woodTex) {
  m.color.set(p.color ?? 0xffffff);
  m.roughness = p.roughness ?? 0.5;
  m.metalness = p.metalness ?? 0;
  m.emissive.set(p.emissive ?? 0x000000);
  m.emissiveIntensity = p.emissiveIntensity ?? 1;
  const map = p.wood ? woodTex : null;
  if (m.map !== map) { m.map = map; m.needsUpdate = true; }
}

function shadowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  const g = x.createRadialGradient(128, 128, 30, 128, 128, 128);
  g.addColorStop(0, 'rgba(0,0,0,.75)'); g.addColorStop(0.65, 'rgba(0,0,0,.45)'); g.addColorStop(1, 'rgba(0,0,0,0)');
  x.fillStyle = g; x.fillRect(0, 0, 256, 256);
  return new THREE.CanvasTexture(c);
}

export function buildDevice(scene) {
  const root = new THREE.Group();
  scene.add(root);
  const hitTargets = [];
  const hit = (obj, tag) => { obj.userData.hit = tag; hitTargets.push(obj); return obj; };

  let skin = SKINS[0];
  const pink = std(0xff3f94, { roughness: 0.32 });
  const bodyAlt = std(0xff3f94, { roughness: 0.32 });
  const yellow = std(0xffd23f, { roughness: 0.4 });
  const mint = std(0x2ad4bd, { roughness: 0.42 });
  const plum = std(0x2a0f3a, { roughness: 0.55 });
  const black = std(0x15101c, { roughness: 0.75 });
  const wood = canvasTexture(1024, 1024, drawWood, true);
  wood.redraw();
  const metal = std(0xc8ced9, { metalness: 0.85, roughness: 0.3 });
  const cavity = std(0x170d26, { roughness: 1, side: THREE.BackSide });
  const glass = new THREE.MeshStandardMaterial({
    color: 0xdff4ff, transparent: true, opacity: 0.05, roughness: 0.04, metalness: 0.1,
    depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 0.7,
  });

  // ---- the arcade floor the machine stands on ----
  const floorArt = canvasTexture(512, 512, (x, w, h) => skin.floor(x, w, h), true);
  const floorMat = new THREE.MeshStandardMaterial({ map: floorArt.tex, roughness: 1 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = GROUND_Y; scene.add(floor);
  const contact = new THREE.Mesh(new THREE.PlaneGeometry(22, 20), new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthWrite: false }));
  contact.rotation.x = -Math.PI / 2; contact.position.set(0, GROUND_Y + 0.02, 0.8); scene.add(contact);

  // ---- plinth and feet ----
  root.add(at(box(SHELL.halfW * 2 - 0.3, SHELL.plinthTop - (GROUND_Y + 0.12), 7.9, black), 0, (SHELL.plinthTop + GROUND_Y + 0.12) / 2, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    root.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 0.14, 16), metal), sx * 4.9, GROUND_Y + 0.07, sz * 3.5));
  }

  // ---- lower cabinet shell ----
  const lowerH = 0 - SHELL.plinthTop, lowerY = SHELL.plinthTop / 2;
  const decals = [];
  for (const s of [-1, 1]) {
    const slab = rbox(0.4, lowerH, SHELL.front - SHELL.back, pink, 0.08);
    slab.position.set(s * (SHELL.halfW - 0.2), lowerY, 0);
    root.add(slab);
    root.add(at(box(0.12, lowerH, 0.1, yellow), s * (SHELL.halfW - 0.2), lowerY, SHELL.front + 0.02));
    const decal = canvasPlane(6.6, 8.2, (x, cw, ch) => skin.decal(x, cw, ch), { px: 512 });
    decals.push(decal);
    decal.mesh.rotation.y = s * Math.PI / 2;
    decal.mesh.position.set(s * (SHELL.halfW + 0.005), lowerY - 0.2, 0);
    root.add(decal.mesh);
  }
  root.add(at(box(SHELL.halfW * 2 - 0.8, lowerH, 0.3, pink), 0, lowerY, SHELL.back + 0.15));

  // Front panel: one sheet with the prize door, capsule window and pickup alcove cut out of it.
  const frontShape = rectInto(new THREE.Shape(), -SHELL.halfW + 0.38, SHELL.plinthTop, SHELL.halfW - 0.38, -0.1, 0.02);
  frontShape.holes.push(rectInto(new THREE.Path(), BIN.x - BIN.halfW, BIN.y0, BIN.x + BIN.halfW, BIN.y1, 0.16));
  frontShape.holes.push(rectInto(new THREE.Path(), BAY.x0, BAY.windowY0, BAY.x1, BAY.windowY1, 0.16));
  frontShape.holes.push(rectInto(new THREE.Path(), BAY.x0, BAY.alcoveY0, BAY.x1, BAY.alcoveY1, 0.16));
  const frontGeo = new THREE.ExtrudeGeometry(frontShape, { depth: 0.28, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 6 });
  const frontUv = frontGeo.attributes.uv;
  for (let i = 0; i < frontUv.count; i++) frontUv.setXY(i, frontUv.getX(i) * 0.09, frontUv.getY(i) * 0.09);
  const front = new THREE.Mesh(frontGeo, pink);
  front.position.z = SHELL.front - 0.31;
  root.add(front);

  // ---- claw prize door: bin behind a hinged smoked flap ----
  const binH = BIN.y1 - BIN.floorY;
  root.add(at(box(BIN.halfW * 2 - 0.02, binH, SHELL.front - CZ_EDGE, cavity), BIN.x, (BIN.y1 + BIN.floorY) / 2, (SHELL.front + CZ_EDGE) / 2));
  root.add(at(box(BIN.halfW * 2 + 0.1, 0.1, 3, std(0x2a2038, { roughness: 0.8 })), BIN.x, BIN.floorY - 0.05, 2.6));
  const flapPivot = new THREE.Group();
  flapPivot.position.set(BIN.x, BIN.y1 - 0.02, SHELL.front + 0.04);
  const flapMat = new THREE.MeshStandardMaterial({ color: 0x1c0e28, transparent: true, opacity: 0.5, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: 0.25 });
  const flap = new THREE.Mesh(new THREE.PlaneGeometry(BIN.halfW * 2 - 0.08, BIN.y1 - BIN.y0 - 0.06), flapMat);
  flap.position.y = -(BIN.y1 - BIN.y0) / 2 + 0.02;
  flapPivot.add(flap);
  const push = label(1.3, 0.42, 'PUSH', { color: '#fff6e8' });
  push.position.set(0, -BIN.y1 + BIN.y0 + 0.5, 0.012);
  flapPivot.add(push);
  root.add(flapPivot);
  const doorRim = yellow;
  root.add(at(box(BIN.halfW * 2 + 0.2, 0.1, 0.1, doorRim), BIN.x, BIN.y1 + 0.05, SHELL.front + 0.02));
  root.add(at(box(BIN.halfW * 2 + 0.2, 0.1, 0.1, doorRim), BIN.x, BIN.y0 - 0.05, SHELL.front + 0.02));
  for (const s of [-1, 1]) root.add(at(box(0.1, BIN.y1 - BIN.y0 + 0.2, 0.1, doorRim), BIN.x + s * (BIN.halfW + 0.05), (BIN.y0 + BIN.y1) / 2, SHELL.front + 0.02));
  const prizePlate = label(BIN.halfW * 2 - 0.2, 0.62, 'PRIZE', { color: '#ffd23f', bg: '#2a0f3a', font: '400 %px Bungee, Impact, sans-serif', scale: 0.6 });
  root.add(at(prizePlate, BIN.x, BIN.y1 + 0.55, SHELL.front + 0.015));

  // ---- capsule bay: hopper, gate wheel and ramps behind one window, pickup alcove below ----
  const bayW = BAY.x1 - BAY.x0, bayX = (BAY.x0 + BAY.x1) / 2;
  const bayH = BAY.windowY1 - BAY.windowY0, bayY = (BAY.windowY0 + BAY.windowY1) / 2;
  const bayBack = std(0x38225c, { roughness: 0.9, side: THREE.BackSide });
  root.add(at(box(bayW + 0.04, bayH + 0.3, SHELL.front - 0.1 - 2.3, bayBack), bayX, bayY, (SHELL.front - 0.1 + 2.3) / 2));
  // hopper funnel plates, sloping down to the gate
  const plateZ = (HOPPER.z0 + HOPPER.z1) / 2, plateD = HOPPER.z1 - HOPPER.z0 + 0.1;
  for (const s of [-1, 1]) {
    const inner = WHEEL.x + s * (WHEEL.outer - 0.08), outer = s < 0 ? HOPPER.x0 : HOPPER.x1;
    const fy = (x) => FUNNEL.y + FUNNEL.slope * Math.abs(x - WHEEL.x) - 0.05;
    const len = Math.hypot(outer - inner, fy(outer) - fy(inner));
    const plate = box(len, 0.09, plateD, mint);
    plate.position.set((inner + outer) / 2, (fy(inner) + fy(outer)) / 2, plateZ);
    plate.rotation.z = Math.atan2(fy(outer) - fy(inner), outer - inner);
    root.add(plate);
  }
  // star wheel: four pockets; half a turn carries one capsule from the hopper to the ramps
  const wheelShape = new THREE.Shape();
  for (let i = 0; i <= 96; i++) {
    const th = (i / 96) * Math.PI * 2;
    const r = WHEEL.outer - 0.34 * Math.pow(Math.max(0, Math.cos(4 * th)), 6);
    const px = Math.cos(th) * r, py = Math.sin(th) * r;
    if (i === 0) wheelShape.moveTo(px, py); else wheelShape.lineTo(px, py);
  }
  const wheelGeo = new THREE.ExtrudeGeometry(wheelShape, { depth: 0.6, bevelEnabled: false, curveSegments: 4 });
  wheelGeo.translate(0, 0, -0.3);
  const wheel = new THREE.Mesh(wheelGeo, yellow);
  wheel.position.set(WHEEL.x, WHEEL.y, BAY.z);
  root.add(wheel);
  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.2, 12), metal);
  axle.rotation.x = Math.PI / 2; axle.position.set(WHEEL.x, WHEEL.y, BAY.z - 0.2);
  root.add(axle);
  // zig-zag ramps; each strip stops short at its low end so the capsule tips off
  const addRamp = (p, q, x0, x1) => {
    const m = (q.y - p.y) / (q.x - p.x);
    const cy = (x) => p.y + m * (x - p.x) - (CAP_R + 0.05) * Math.sqrt(1 + m * m);
    const len = Math.hypot(x1 - x0, cy(x1) - cy(x0));
    const strip = box(len, 0.08, 0.78, mint);
    strip.position.set((x0 + x1) / 2, (cy(x0) + cy(x1)) / 2, BAY.z);
    strip.rotation.z = Math.atan2(cy(x1) - cy(x0), x1 - x0);
    root.add(strip);
  };
  addRamp(PATH[1], PATH[2], 2.45, 4.28);
  addRamp(PATH[3], PATH[4], 4.98, 1.22);
  // light inside the bay, window glass and frame
  root.add(at(box(bayW - 0.3, 0.06, 0.12, glow(0xfff1e0, 2.2)), bayX, BAY.windowY1 - 0.08, 3.75));
  const bayLight = new THREE.PointLight(0xfff1e0, 6, 9);
  bayLight.position.set(bayX, -3.7, 3.4);
  root.add(bayLight);
  const bayGlass = new THREE.Mesh(new THREE.PlaneGeometry(bayW + 0.05, bayH + 0.05), glass);
  bayGlass.position.set(bayX, bayY, SHELL.front - 0.06); bayGlass.renderOrder = 5;
  root.add(bayGlass);
  for (const [w, h, x, y] of [
    [bayW + 0.2, 0.1, bayX, BAY.windowY1 + 0.05], [bayW + 0.2, 0.1, bayX, BAY.windowY0 - 0.05],
    [0.1, bayH + 0.2, BAY.x0 - 0.05, bayY], [0.1, bayH + 0.2, BAY.x1 + 0.05, bayY],
  ]) root.add(at(box(w, h, 0.1, mint), x, y, SHELL.front + 0.02));
  // LED sign strip between the window and the alcove
  const sign = makeLed(bayW, BAY.signY1 - BAY.signY0 - 0.14, { color: '#2ad4bd', dim: '#0d3a33' });
  sign.mesh.position.set(bayX, (BAY.signY0 + BAY.signY1) / 2, SHELL.front + 0.012);
  root.add(sign.mesh);
  // pickup alcove: open to the player, with a lip that keeps capsules in
  const alcoveH = BAY.alcoveY1 - BAY.alcoveY0;
  root.add(at(box(bayW + 0.04, alcoveH, SHELL.front - 0.1 - 2.6, cavity), bayX, (BAY.alcoveY0 + BAY.alcoveY1) / 2, (SHELL.front - 0.1 + 2.6) / 2));
  root.add(at(box(bayW, 0.08, 1.5, std(0x2a2038, { roughness: 0.8 })), bayX, BAY.trayY - CAP_R - 0.04, 3.3));
  root.add(at(box(bayW + 0.2, 0.34, 0.14, mint), bayX, BAY.alcoveY0 + 0.1, SHELL.front + 0.03));
  root.add(at(box(bayW - 0.3, 0.05, 0.1, glow(0xfff1e0, 1.8)), bayX, BAY.alcoveY1 - 0.05, 3.8));
  const alcoveLight = new THREE.PointLight(0xfff1e0, 2.5, 5);
  alcoveLight.position.set(bayX, BAY.alcoveY1 - 0.15, 4.2);
  root.add(alcoveLight);
  const alcoveHit = new THREE.Mesh(new THREE.PlaneGeometry(bayW, alcoveH));
  alcoveHit.position.set(bayX, (BAY.alcoveY0 + BAY.alcoveY1) / 2, SHELL.front + 0.1);
  alcoveHit.visible = false;
  root.add(hit(alcoveHit, 'alcove'));

  // ---- control panel: a wedge with the controls set into its sloped top ----
  const wedge = new THREE.Shape();
  wedge.moveTo(PANEL.backZ - 0.4, PANEL.backY);
  wedge.lineTo(PANEL.frontZ, PANEL.frontY);
  wedge.quadraticCurveTo(PANEL.noseZ + 0.06, PANEL.frontY - 0.05, PANEL.noseZ, PANEL.frontY - 0.4);
  wedge.lineTo(PANEL.frontZ, PANEL.frontY - 1.1);
  wedge.quadraticCurveTo(5.5, PANEL.chinY + 0.5, PANEL.backZ - 0.4, PANEL.chinY);
  wedge.closePath();
  const wedgeGeo = new THREE.ExtrudeGeometry(wedge, { depth: PANEL.halfW * 2, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2, curveSegments: 10 });
  wedgeGeo.rotateY(-Math.PI / 2);
  wedgeGeo.translate(PANEL.halfW, 0, 0);
  const wedgeMesh = new THREE.Mesh(wedgeGeo, plum);
  root.add(wedgeMesh);
  root.add(at(box(PANEL.halfW * 2 + 0.06, 0.1, 0.1, yellow), 0, PANEL.frontY - 0.03, PANEL.frontZ + 0.04));

  const tilt = Math.atan2(PANEL.backY - PANEL.frontY, PANEL.frontZ - PANEL.backZ);
  const deck = new THREE.Group();
  deck.position.set(0, (PANEL.backY + PANEL.frontY) / 2 + 0.035, (PANEL.backZ + PANEL.frontZ) / 2);
  deck.rotation.x = tilt;
  root.add(deck);
  const flat = (mesh, x, z, y = 0.012) => { mesh.rotation.x = -Math.PI / 2; mesh.position.set(x, y, z); deck.add(mesh); return mesh; };

  // joystick
  const JOY = { x: -3.3, z: 0.05 };
  deck.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.66, 0.06, 28), metal), JOY.x, 0.03, JOY.z));
  deck.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 0.18, 20), black), JOY.x, 0.14, JOY.z));
  const stick = new THREE.Group();
  stick.position.set(JOY.x, 0.14, JOY.z);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.86, 14), metal);
  shaft.position.y = 0.43;
  const ballMat = std(0xff3b30, { roughness: 0.25 });
  const ball = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 18), ballMat);
  ball.position.y = 0.94;
  stick.add(shaft, ball);
  deck.add(stick);
  hit(ball, 'joystick'); hit(shaft, 'joystick');
  const moveLabel = flat(label(2.2, 0.42, '◄ ▲ MOVE ▼ ►', { color: '#2ad4bd' }), JOY.x, JOY.z + 0.92);

  // drop button
  const BTN = { x: 3.3, z: 0.05 };
  deck.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.84, 0.88, 0.1, 36), yellow), BTN.x, 0.05, BTN.z));
  const plunger = new THREE.Group();
  plunger.position.set(BTN.x, 0.1, BTN.z);
  const btnMat = new THREE.MeshStandardMaterial({ color: 0xff2d20, emissive: 0xff2010, emissiveIntensity: 0.5, roughness: 0.28 });
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.66, 0.68, 0.16, 32), btnMat);
  skirt.position.y = 0.08;
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.66, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), btnMat);
  dome.scale.y = 0.42; dome.position.y = 0.16;
  plunger.add(skirt, dome);
  deck.add(plunger);
  hit(skirt, 'drop'); hit(dome, 'drop');
  const dropLabel = flat(label(1.5, 0.42, 'DROP', { color: '#ffd23f', font: '800 %px Nunito, Impact, sans-serif', scale: 0.8 }), BTN.x, BTN.z + 0.98);

  // POS terminal: flush-mounted card reader with a screen, a contactless pad and four status lights
  const posGroup = new THREE.Group();
  posGroup.position.set(0, 0, 0.52);
  deck.add(posGroup);
  const posBody = rbox(2.3, 0.1, 1.3, std(0x1b1b22, { roughness: 0.35 }), 0.04);
  posBody.position.y = 0.05;
  posGroup.add(posBody);
  hit(posBody, 'pos');

  const POS_SCREENS = {
    idle: { lines: ['TAP CARD', `1 PLAY  ${POS.pricePerPlay}`], bg: '#0d2a4a', fg: '#e8f4ff' },
    read: { lines: ['READING', 'HOLD CARD'], bg: '#0d2a4a', fg: '#e8f4ff' },
    process: { lines: ['PROCESSING', 'PLEASE WAIT'], bg: '#0d2a4a', fg: '#ffd23f' },
    approved: { lines: ['APPROVED', '+1 PLAY'], bg: '#0d4a2e', fg: '#c9ffe0' },
    full: { lines: ['CREDITS FULL', 'NOT CHARGED'], bg: '#4a1620', fg: '#ffd9dc' },
  };
  let posShown = 'idle';
  const posScreen = canvasPlane(1.24, 0.92, (x, cw, ch) => {
    const s = POS_SCREENS[posShown];
    x.fillStyle = s.bg; x.fillRect(0, 0, cw, ch);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = s.fg;
    x.font = `900 ${Math.round(ch * 0.2)}px Nunito, Arial, sans-serif`;
    x.fillText(s.lines[0], cw / 2, ch * 0.38, cw * 0.92);
    x.font = `800 ${Math.round(ch * 0.14)}px Nunito, Arial, sans-serif`;
    x.fillText(s.lines[1], cw / 2, ch * 0.68, cw * 0.92);
  }, { px: 224, lit: false });
  document.fonts?.ready.then(posScreen.redraw);
  flat(posScreen.mesh, -0.44, -0.08, 0.104);
  posGroup.add(posScreen.mesh);
  hit(posScreen.mesh, 'pos');

  const posPad = canvasPlane(0.72, 0.72, (x, cw, ch) => {
    x.fillStyle = '#26262f'; x.beginPath(); x.roundRect(0, 0, cw, ch, ch * 0.1); x.fill();
    x.strokeStyle = '#e8f4ff'; x.lineCap = 'round'; x.lineWidth = ch * 0.055;
    for (let i = 0; i < 4; i++) {
      x.beginPath();
      x.arc(cw * 0.3, ch * 0.5, ch * (0.12 + i * 0.1), -0.75, 0.75);
      x.stroke();
    }
  }, { px: 128, transparent: true });
  flat(posPad.mesh, 0.66, 0.0, 0.104);
  posGroup.add(posPad.mesh);
  hit(posPad.mesh, 'pos');

  const posLeds = [];
  for (let i = 0; i < 4; i++) {
    const led = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), glow(0x38e27a, 0.05));
    led.position.set(0.39 + i * 0.18, 0.105, -0.48);
    posGroup.add(led);
    posLeds.push(led);
  }
  const posTag = label(1.7, 0.2, 'TAP TO PAY', { color: '#e8f4ff', scale: 0.78 });
  flat(posTag, 0, 0.53, 0.104);
  posGroup.add(posTag);

  // the card that comes in to tap the pad
  const card = rbox(0.86, 0.03, 0.54, std(0x2ad4bd, { metalness: 0.3, roughness: 0.35 }), 0.012);
  card.visible = false;
  const stripe = box(0.86, 0.004, 0.1, black); stripe.position.set(0, 0.016, -0.12);
  const chip = box(0.13, 0.006, 0.1, yellow); chip.position.set(-0.26, 0.017, 0.08);
  card.add(stripe, chip);
  posGroup.add(card);

  // main display, angled up toward the player
  const dispHousing = new THREE.Group();
  dispHousing.position.set(0, -0.2, 4.6);
  dispHousing.rotation.x = -0.34;
  dispHousing.add(rbox(4.8, 1.12, 0.32, black, 0.06));
  const display = makeLed(4.5, 0.88, { twoLines: true });
  display.mesh.position.z = 0.17;
  dispHousing.add(display.mesh);
  root.add(dispHousing);

  // ---- playfield: floor with the chute hole, chute walls, shield, back wall, glass, posts ----
  const fieldFloor = std(0xc9a0ea, { roughness: 0.9 });
  const fa = box(2 * HALF_W, 0.3, CZ_EDGE + HALF_D, fieldFloor);
  fa.position.set(0, -0.15, (CZ_EDGE - HALF_D) / 2); fa.receiveShadow = true;
  const fb = box(HALF_W - CX_EDGE, 0.3, HALF_D - CZ_EDGE, fieldFloor);
  fb.position.set((HALF_W + CX_EDGE) / 2, -0.15, (HALF_D + CZ_EDGE) / 2); fb.receiveShadow = true;
  root.add(fa, fb);
  root.add(at(box(CHUTE_W, -BIN.y1, CHUTE_D, cavity), CHUTE_X, BIN.y1 / 2, CHUTE_Z));

  const wallMat = std(0x2ad4bd, { roughness: 0.5 });
  const w1 = at(box(WALL_T, WALL_H, CHUTE_D, wallMat), CX_EDGE, WALL_H / 2, CHUTE_Z);
  const w2 = at(box(CHUTE_W, WALL_H, WALL_T, wallMat), CHUTE_X, WALL_H / 2, CZ_EDGE);
  w1.castShadow = w2.castShadow = true; w1.receiveShadow = w2.receiveShadow = true;
  root.add(w1, w2);
  const shieldH = SHIELD_H - WALL_H;
  const shieldMat = new THREE.MeshStandardMaterial({ color: 0xd8f6ff, transparent: true, opacity: 0.2, roughness: 0.05, metalness: 0.1, depthWrite: false, side: THREE.DoubleSide });
  root.add(at(box(WALL_T * 0.4, shieldH, CHUTE_D, shieldMat), CX_EDGE, WALL_H + shieldH / 2, CHUTE_Z));
  root.add(at(box(CHUTE_W, shieldH, WALL_T * 0.4, shieldMat), CHUTE_X, WALL_H + shieldH / 2, CZ_EDGE));
  root.add(at(box(WALL_T * 0.6, 0.08, CHUTE_D, mint), CX_EDGE, SHIELD_H, CHUTE_Z));
  root.add(at(box(CHUTE_W, 0.08, WALL_T * 0.6, mint), CHUTE_X, SHIELD_H, CZ_EDGE));

  const wallArt = canvasTexture(1024, 820, (x, w, h) => skin.backWall(x, w, h));
  const backWall = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF_W, CAB_H), new THREE.MeshStandardMaterial({ map: wallArt.tex, roughness: 1 }));
  backWall.position.set(0, CAB_H / 2, -HALF_D); backWall.receiveShadow = true;
  root.add(backWall);
  root.add(at(box(2 * HALF_W + 0.6, CAB_H, 0.3, bodyAlt), 0, CAB_H / 2, SHELL.back + 0.15));
  const frontGlass = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF_W + 0.1, CAB_H), glass);
  frontGlass.position.set(0, CAB_H / 2, HALF_D + 0.14); frontGlass.renderOrder = 5;
  root.add(frontGlass);
  for (const s of [-1, 1]) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(2 * HALF_D + 0.1, CAB_H), glass);
    pane.rotation.y = Math.PI / 2; pane.position.set(s * (HALF_W + 0.14), CAB_H / 2, 0); pane.renderOrder = 5;
    root.add(pane);
  }
  const postX = SHELL.halfW - 0.27, postZ = SHELL.front - 0.27;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    root.add(at(rbox(0.54, CAB_H + 0.2, 0.54, bodyAlt, 0.1), sx * postX, CAB_H / 2, sz * postZ));
  }
  root.add(at(box(SHELL.halfW * 2 - 0.5, 0.2, 0.3, yellow), 0, 0.02, HALF_D + 0.36));
  for (const s of [-1, 1]) root.add(at(box(0.3, 0.2, 2 * HALF_D, yellow), s * (HALF_W + 0.36), 0.02, 0));

  // gantry rails under the head, and LED strips lighting the playfield
  const railMat = std(0x7a69a8, { metalness: 0.4, roughness: 0.5 });
  for (const s of [-1, 1]) root.add(at(box(0.16, 0.16, 2 * HALF_D, railMat), s * (HALF_W - 0.3), RAIL_Y + 0.3, 0));
  root.add(at(box(2 * HALF_W + 0.5, 0.12, 2 * HALF_D + 0.5, plum), 0, CAB_H - 0.02, 0));
  const strip = glow(0xfff7ee, 2.6);
  root.add(at(box(2 * HALF_W - 0.6, 0.05, 0.14, strip), 0, CAB_H - 0.1, HALF_D - 0.25));
  root.add(at(box(2 * HALF_W - 0.6, 0.05, 0.14, strip), 0, CAB_H - 0.1, -HALF_D + 0.25));

  const chuteTag = label(2.0, 0.66, 'PRIZE ▼', { color: '#ffd23f', bg: '#2a0f3a', scale: 0.56 });
  chuteTag.position.set(CHUTE_X, SHIELD_H + 0.5, HALF_D - 0.2);
  root.add(chuteTag);

  // ---- head with the lit marquee and chasing bulbs, crown on top ----
  const headH = SHELL.headTop - SHELL.headBottom, headY = (SHELL.headTop + SHELL.headBottom) / 2;
  root.add(at(rbox(SHELL.halfW * 2, headH, SHELL.front - SHELL.back, bodyAlt, 0.2), 0, headY, 0));
  const marquee = canvasPlane(10.2, 1.86, (x, cw, ch) => skin.marquee(x, cw, ch), { px: 372, lit: false });
  marquee.mesh.position.set(0, headY, SHELL.front + 0.012);
  root.add(marquee.mesh);
  document.fonts?.ready.then(marquee.redraw);

  const bulbSpots = [];
  const bw = 10.5, bh = 2.1;
  for (let i = 0; i <= 30; i++) { const x = -bw / 2 + (i / 30) * bw; bulbSpots.push([x, headY + bh / 2], [x, headY - bh / 2]); }
  for (let i = 1; i < 6; i++) { const y = headY - bh / 2 + (i / 6) * bh; bulbSpots.push([-bw / 2, y], [bw / 2, y]); }
  const bulbGeo = new THREE.SphereGeometry(0.075, 10, 8);
  const bulbA = new THREE.MeshStandardMaterial({ color: 0x332200, emissive: 0xffd76a, emissiveIntensity: 2.4 });
  const bulbB = bulbA.clone();
  const groupA = bulbSpots.filter((_, i) => i % 4 < 2), groupB = bulbSpots.filter((_, i) => i % 4 >= 2);
  const m4 = new THREE.Matrix4();
  for (const [spots, mat] of [[groupA, bulbA], [groupB, bulbB]]) {
    const inst = new THREE.InstancedMesh(bulbGeo, mat, spots.length);
    spots.forEach(([x, y], i) => inst.setMatrixAt(i, m4.makeTranslation(x, y, SHELL.front + 0.05)));
    root.add(inst);
  }

  const archShape = (w, rise, base) => {
    const s = new THREE.Shape();
    s.moveTo(-w, 0); s.lineTo(-w, base); s.quadraticCurveTo(0, base + rise * 2, w, base); s.lineTo(w, 0); s.closePath();
    return s;
  };
  const crownH = SHELL.crownTop - SHELL.headTop;
  const crownGeo = new THREE.ExtrudeGeometry(archShape(5.2, (crownH - 0.45) * 1, 0.45), { depth: 1.1, bevelEnabled: true, bevelSize: 0.05, bevelThickness: 0.05, bevelSegments: 2, curveSegments: 24 });
  root.add(at(new THREE.Mesh(crownGeo, bodyAlt), 0, SHELL.headTop - 0.02, 2.75));
  const crownMat = new THREE.MeshStandardMaterial({ color: 0x2a0f3a, emissive: 0x7a2bb0, emissiveIntensity: 0.5, roughness: 0.5 });
  const crownInner = new THREE.Mesh(new THREE.ShapeGeometry(archShape(4.7, (crownH - 0.7) * 1, 0.3), 24), crownMat);
  crownInner.position.set(0, SHELL.headTop + 0.05, 3.91);
  root.add(crownInner);

  // ---- rear: vents, service door, power cord ----
  const rearZ = SHELL.back - 0.012;
  for (let i = 0; i < 7; i++) {
    root.add(at(box(4.2, 0.09, 0.05, black), 0, 5.2 - i * 0.34, SHELL.back - 0.02));
  }
  const serviceMat = std(0xc42a6f, { roughness: 0.45 });
  const service = rbox(6.4, 6.6, 0.1, serviceMat, 0.04);
  service.position.set(0, -5.7, rearZ - 0.03);
  root.add(service);
  root.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.08, 16).rotateX(Math.PI / 2), metal), 2.7, -5.7, rearZ - 0.11));
  const svcLabel = label(3.2, 0.42, 'SERVICE', { color: '#fff6e8' });
  svcLabel.rotation.y = Math.PI; svcLabel.position.set(0, -3.1, rearZ - 0.09);
  root.add(svcLabel);
  const cordCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(4.2, -9.6, SHELL.back - 0.02), new THREE.Vector3(4.3, -10.6, SHELL.back - 0.6),
    new THREE.Vector3(5.4, GROUND_Y + 0.05, SHELL.back - 2.2), new THREE.Vector3(9, GROUND_Y + 0.05, SHELL.back - 3.4),
  ]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(cordCurve, 30, 0.05, 8, false), black));

  // Invisible body: stops pointer picks reaching controls through the machine from behind.
  const body = box(SHELL.halfW * 2, SHELL.headTop - GROUND_Y, 3 - SHELL.back, new THREE.MeshBasicMaterial());
  body.position.set(0, (SHELL.headTop + GROUND_Y) / 2, (3 + SHELL.back) / 2);
  body.visible = false;
  root.add(hit(body, 'body'));

  // ---- moving parts ----
  const tiltNow = { x: 0, z: 0 };
  let pressT = 0, chase = 0, busyGlow = 0.5, time = 0;
  const reduceMotion = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  function applySkin(next) {
    skin = next;
    setFinish(pink, skin.body, wood.tex);
    setFinish(bodyAlt, skin.bodyAlt, wood.tex);
    setFinish(yellow, skin.trim);
    setFinish(mint, skin.accent);
    setFinish(plum, skin.panel);
    setFinish(wallMat, skin.chuteWall);
    setFinish(fieldFloor, skin.fieldFloor);
    setFinish(serviceMat, skin.service);
    setFinish(bayBack, skin.bayBack);
    setFinish(crownMat, skin.crownInner);
    setFinish(ballMat, skin.ball);
    setFinish(btnMat, skin.button);
    btnMat.emissiveIntensity = 0.5;
    for (const b of [bulbA, bulbB]) { b.color.set(skin.bulb.color); b.emissive.set(skin.bulb.emissive); }
    strip.emissive.set(skin.strip);
    display.setColors(skin.led.color, skin.led.dim);
    sign.setColors(skin.sign.color, skin.sign.dim);
    prizePlate.userData.restyle(skin.plate);
    chuteTag.userData.restyle(skin.tag);
    moveLabel.userData.restyle({ color: skin.moveText });
    dropLabel.userData.restyle({ color: skin.dropText });
    floorArt.tex.repeat.set(skin.room.repeat, skin.room.repeat);
    floorMat.roughness = skin.room.roughness;
    const redrawArt = () => { floorArt.redraw(); wallArt.redraw(); marquee.redraw(); decals.forEach((p) => p.redraw()); };
    redrawArt();
    // Canvas text needs the skin's font loaded; draw again once it arrives.
    const applied = skin;
    Promise.all((skin.fonts || []).map((f) => document.fonts?.load(f))).then(() => {
      if (skin !== applied) return;
      marquee.redraw();
      prizePlate.userData.restyle({});
    }).catch(() => {});
  }
  applySkin(skin);

  return {
    root, hitTargets, display, sign, applySkin,
    pressDrop() { pressT = 0.2; },
    update(dt, { input, busy, credits, wheelAngle, doorOpen, pos }) {
      time += dt;
      const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
      const dz = (input.back ? 1 : 0) - (input.forward ? 1 : 0);
      const k = Math.min(1, dt * 16);
      tiltNow.x += (dz * 0.42 - tiltNow.x) * k;
      tiltNow.z += (-dx * 0.42 - tiltNow.z) * k;
      stick.rotation.set(tiltNow.x, 0, tiltNow.z);

      pressT = Math.max(0, pressT - dt);
      plunger.position.y = 0.1 - (pressT > 0 ? 0.11 : 0);
      const wantGlow = busy || credits <= 0 ? 0.05 : 0.55 + (reduceMotion ? 0 : 0.35 * Math.sin(time * 4));
      busyGlow += (wantGlow - busyGlow) * Math.min(1, dt * 8);
      btnMat.emissiveIntensity = busyGlow;

      // POS terminal: screen, status lights and the card coming in to tap
      if (pos.state !== posShown) { posShown = pos.state; posScreen.redraw(); }
      const lit = pos.state === 'read' ? 1 + Math.floor((pos.t / POS_TIMES.read) * 4)
        : pos.state === 'process' || pos.state === 'approved' ? 4 : 0;
      const beacon = pos.state === 'idle' && credits <= 0 && Math.sin(time * 6) > 0;   // nudge the player when out of credits
      posLeds.forEach((led, i) => { led.material.emissiveIntensity = i < lit || beacon ? 3 : 0.05; });
      let cardOn = false, cardY = 0;
      if (pos.state === 'read') { cardOn = true; cardY = 0.2 + (1 - Math.min(1, pos.t / 0.3)) ** 2 * 1.5; }
      else if (pos.state === 'process') { cardOn = true; cardY = 0.2; }
      else if (pos.state === 'approved' && pos.t < 0.5) { cardOn = true; cardY = 0.2 + (pos.t / 0.5) ** 2 * 1.6; }
      card.visible = cardOn;
      if (cardOn) card.position.set(0.66, cardY, 0);

      wheel.rotation.z = wheelAngle;
      flapPivot.rotation.x = -doorOpen * 1.05;

      if (!reduceMotion) {
        chase += dt;
        const phase = Math.floor(chase / 0.28) % 2 === 0;
        bulbA.emissiveIntensity = phase ? 3 : 0.35;
        bulbB.emissiveIntensity = phase ? 0.35 : 3;
      }
      display.tick(dt);
      sign.tick(dt);
    },
  };
}
