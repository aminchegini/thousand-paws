// Three.js meshes for the gantry/claw and the plush toys.

import * as THREE from 'three';
import { box, sphere, std, disposeObject } from '@paws/arcade-kit';
import { HALF_W, RAIL_Y, PRONG } from './sim.js';

const INK = 0x2a0f3a;
const UP = new THREE.Vector3(0, 1, 0);

export function makeClaw() {
  const group = new THREE.Group();
  const metal = std(0xd9dfeb, { metalness: 0.7, roughness: 0.35 });
  const dark = std(0x4a4f63, { metalness: 0.5, roughness: 0.5 });
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.42, 0.5, 24), metal);
  head.position.y = 0.1; head.castShadow = true;
  const cap = sphere(0.2, dark, 16); cap.position.y = 0.42;
  group.add(head, cap);
  // three prongs, each hinged at the head and bent inward at the tip
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(0.12, 0, 0), new THREE.Vector3(0.45, -PRONG * 0.5, 0), new THREE.Vector3(0.1, -PRONG, 0),
  );
  const tubeGeo = new THREE.TubeGeometry(curve, 16, 0.06, 8, false);
  const pivots = [];
  for (let i = 0; i < 3; i++) {
    const arm = new THREE.Group(); arm.rotation.y = (i * Math.PI * 2) / 3; arm.position.y = -0.12;
    const pivot = new THREE.Group();
    const tube = new THREE.Mesh(tubeGeo, metal); tube.castShadow = true;
    pivot.add(tube); arm.add(pivot); group.add(arm); pivots.push(pivot);
  }
  return {
    group,
    setOpen(o) { for (const p of pivots) p.rotation.z = 0.1 + 0.8 * o; },
  };
}

export function makeGantry() {
  const group = new THREE.Group();
  const crossbar = box(2 * HALF_W - 0.4, 0.14, 0.34, std(0x4a3a70, { metalness: 0.3, roughness: 0.6 }));
  crossbar.position.y = RAIL_Y + 0.3;
  const carriage = box(0.8, 0.45, 0.7, std(0xffd23f, { roughness: 0.5 })); carriage.castShadow = true;
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 8), std(INK));
  const claw = makeClaw();
  group.add(crossbar, carriage, cable, claw.group);
  const a = new THREE.Vector3(), b = new THREE.Vector3(), dir = new THREE.Vector3();
  return {
    group,
    update(c) {
      crossbar.position.z = c.cz;
      carriage.position.set(c.cx, RAIL_Y, c.cz);
      claw.group.position.set(c.x, c.y, c.z);
      const len = Math.max(0.5, RAIL_Y - c.y);
      claw.group.rotation.set(-Math.atan2(c.swZ, len), 0, Math.atan2(c.swX, len));
      claw.setOpen(c.open);
      a.set(c.cx, RAIL_Y - 0.22, c.cz); b.set(c.x, c.y + 0.45, c.z);
      dir.subVectors(b, a); const d = dir.length();
      cable.position.copy(a).addScaledVector(dir, 0.5);
      cable.scale.set(1, d, 1);
      cable.quaternion.setFromUnitVectors(UP, dir.normalize());
    },
  };
}

function makePlush(kind, colorHex, r) {
  const col = new THREE.Color(colorHex);
  const mat = std(col, { roughness: 0.92 });
  const liteMat = std(col.clone().lerp(new THREE.Color(0xffffff), 0.5), { roughness: 0.92 });
  const ink = std(INK, { roughness: 0.5 });
  const pink = std(0xff7fae, { roughness: 0.8 });
  const g = new THREE.Group();
  const body = sphere(r, mat, 24); body.castShadow = true; body.receiveShadow = true; g.add(body);
  const eye = (s, y = 0.12, z = 0.9) => { const e = sphere(r * 0.1, ink, 10); e.position.set(s * r * 0.32, r * y, r * z); g.add(e); };
  const nose = (m, y, z, s) => { const n = sphere(r * s, m, 10); n.position.set(0, r * y, r * z); g.add(n); };
  switch (kind) {
    case 'bear': {
      for (const s of [-1, 1]) {
        const e = sphere(r * 0.34, mat, 14); e.position.set(s * r * 0.62, r * 0.62, 0); e.castShadow = true; g.add(e);
        const i = sphere(r * 0.17, liteMat, 10); i.position.set(s * r * 0.62, r * 0.62, r * 0.24); g.add(i);
      }
      const muzzle = sphere(r * 0.42, liteMat, 16); muzzle.scale.set(1, 0.75, 0.55); muzzle.position.set(0, -r * 0.14, r * 0.8); g.add(muzzle);
      eye(-1); eye(1); nose(ink, -0.02, 1.06, 0.11);
      break;
    }
    case 'bunny': {
      for (const s of [-1, 1]) {
        const e = sphere(r * 0.2, mat, 12); e.scale.set(1, 2.8, 0.7); e.position.set(s * r * 0.34, r * 1.15, 0); e.castShadow = true; g.add(e);
        const i = sphere(r * 0.1, pink, 8); i.scale.set(1, 2.4, 0.5); i.position.set(s * r * 0.34, r * 1.15, r * 0.12); g.add(i);
      }
      eye(-1); eye(1); nose(pink, -0.02, 0.98, 0.09);
      break;
    }
    case 'cat': {
      for (const s of [-1, 1]) {
        const e = new THREE.Mesh(new THREE.ConeGeometry(r * 0.3, r * 0.6, 12), mat);
        e.position.set(s * r * 0.55, r * 0.95, 0); e.rotation.z = -s * 0.35; e.castShadow = true; g.add(e);
      }
      eye(-1); eye(1); nose(pink, 0, 0.98, 0.08);
      break;
    }
    case 'duck': {
      const beak = new THREE.Mesh(new THREE.ConeGeometry(r * 0.24, r * 0.6, 12), std(0xff8c1a, { roughness: 0.7 }));
      beak.rotation.x = Math.PI / 2; beak.position.set(0, -r * 0.05, r * 1.1); g.add(beak);
      const tuft = sphere(r * 0.16, mat, 8); tuft.position.set(r * 0.1, r * 1.02, 0); g.add(tuft);
      eye(-1, 0.28, 0.88); eye(1, 0.28, 0.88);
      break;
    }
    default: {
      const white = std(0xffffff, { roughness: 0.6 });
      for (const s of [-1, 1]) {
        const b = sphere(r * 0.3, mat, 12); b.position.set(s * r * 0.42, r * 0.72, r * 0.25); b.castShadow = true; g.add(b);
        const w = sphere(r * 0.18, white, 10); w.position.set(s * r * 0.42, r * 0.74, r * 0.44); g.add(w);
        const p = sphere(r * 0.09, ink, 8); p.position.set(s * r * 0.42, r * 0.74, r * 0.6); g.add(p);
      }
      const smile = new THREE.Mesh(new THREE.TorusGeometry(r * 0.42, r * 0.045, 6, 16, Math.PI), ink);
      smile.position.set(0, r * 0.05, r * 0.92); smile.rotation.z = Math.PI; g.add(smile);
    }
  }
  return g;
}

// Builds each kind/colour once at radius 1 and hands out scaled clones that
// share its geometry and materials, so a big pile stays cheap to render.
export function createPlushFactory() {
  const templates = new Map();
  return {
    make(kind, colorHex, r) {
      const key = kind + '|' + colorHex;
      let t = templates.get(key);
      if (!t) { t = makePlush(kind, colorHex, 1); templates.set(key, t); }
      const m = t.clone();
      m.scale.setScalar(r);
      return m;
    },
    dispose() { for (const t of templates.values()) disposeObject(t); templates.clear(); },
  };
}

export { disposeObject };
