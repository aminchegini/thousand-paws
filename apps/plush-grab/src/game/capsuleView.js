// Three.js capsules for the built-in bay: the hopper full of capsules, the one
// riding the wheel and ramps, the ones waiting in the alcove, and the opening
// animation that brings the mini toy out toward the player.

import * as THREE from 'three';
import { CAP_R, OPEN_TIME } from './capsules.js';

const clamp01 = (t) => Math.max(0, Math.min(1, t));
const easeOut = (t) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t) => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
const wrapAngle = (a) => ((((a + Math.PI) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)) - Math.PI;
const TOY_R = CAP_R * 0.55;

export function createCapsuleView(scene, capsules, plush) {
  const bottomGeo = new THREE.SphereGeometry(CAP_R, 18, 9, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2);
  const topGeo = new THREE.SphereGeometry(CAP_R, 18, 9, 0, Math.PI * 2, 0, Math.PI / 2);
  const ringGeo = new THREE.TorusGeometry(CAP_R, 0.02, 6, 22);
  const blobGeo = new THREE.SphereGeometry(TOY_R, 10, 8);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 });
  const shellMats = new Map();
  const blobMats = new Map();
  function shellMat(hex) {
    let m = shellMats.get(hex);
    if (!m) {
      const col = new THREE.Color(hex);
      m = {
        bottom: new THREE.MeshStandardMaterial({ color: col, roughness: 0.28 }),
        top: new THREE.MeshStandardMaterial({ color: col.clone().lerp(new THREE.Color(0xffffff), 0.55), transparent: true, opacity: 0.42, roughness: 0.1, depthWrite: false }),
      };
      shellMats.set(hex, m);
    }
    return m;
  }
  function blobMat(hex) {
    let m = blobMats.get(hex);
    if (!m) { m = new THREE.MeshStandardMaterial({ color: hex, roughness: 0.8 }); blobMats.set(hex, m); }
    return m;
  }

  const meshes = new Map();
  function makeMesh(c) {
    const mats = shellMat(c.shell);
    const g = new THREE.Group();     // position
    const roll = new THREE.Group();  // rolling along the ramps (world z axis)
    const spin = new THREE.Group();  // orientation picked up tumbling in the hopper
    const bottom = new THREE.Mesh(bottomGeo, mats.bottom);
    const ring = new THREE.Mesh(ringGeo, ringMat); ring.rotation.x = Math.PI / 2;
    const topPivot = new THREE.Group();
    const top = new THREE.Mesh(topGeo, mats.top); top.renderOrder = 1;
    topPivot.add(top);
    const blob = new THREE.Mesh(blobGeo, blobMat(c.color));  // cheap stand-in until the capsule leaves the hopper
    spin.add(bottom, ring, topPivot, blob);
    roll.add(spin); g.add(roll);
    g.userData.hit = 'capsule'; g.userData.capId = c.id;
    scene.add(g);
    return { g, roll, spin, topPivot, blob, toy: null, popped: false };
  }

  // sparkle burst when a capsule pops
  const sparkles = [];
  const sparkleBase = new THREE.PointsMaterial({ color: 0xffd23f, size: 0.2, transparent: true, depthWrite: false });
  function burst(x, y, z) {
    const n = 26, pos = new Float32Array(n * 3), vel = [];
    for (let i = 0; i < n; i++) {
      pos.set([x, y, z], i * 3);
      const a = Math.random() * Math.PI * 2, s = 1.2 + Math.random() * 2;
      vel.push([Math.cos(a) * s, 1 + Math.random() * 3, Math.sin(a) * s * 0.7]);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pts = new THREE.Points(geo, sparkleBase.clone());
    scene.add(pts);
    sparkles.push({ pts, vel, t: 0 });
  }
  function stepSparkles(dt) {
    for (let k = sparkles.length - 1; k >= 0; k--) {
      const s = sparkles[k]; s.t += dt;
      const arr = s.pts.geometry.attributes.position.array;
      for (let i = 0; i < s.vel.length; i++) {
        s.vel[i][1] -= 7 * dt;
        arr[i * 3] += s.vel[i][0] * dt; arr[i * 3 + 1] += s.vel[i][1] * dt; arr[i * 3 + 2] += s.vel[i][2] * dt;
      }
      s.pts.geometry.attributes.position.needsUpdate = true;
      s.pts.material.opacity = Math.max(0, 1 - s.t / 0.85);
      if (s.t > 0.85) { scene.remove(s.pts); s.pts.geometry.dispose(); s.pts.material.dispose(); sparkles.splice(k, 1); }
    }
  }

  function update(dt) {
    const seen = new Set();
    for (const c of capsules.caps) {
      seen.add(c.id);
      let m = meshes.get(c.id);
      if (!m) { m = makeMesh(c); meshes.set(c.id, m); }
      if (!m.toy && c.state !== 'hopper') {
        m.toy = plush.make(c.kind, c.color, TOY_R);
        m.blob.visible = false;
        m.spin.add(m.toy);
      }
      m.g.position.set(c.x, c.y, c.z);
      m.g.scale.setScalar(1);
      m.roll.rotation.set(0, 0, c.roll);
      m.spin.rotation.set(c.rx, c.ry, c.rz);
      m.topPivot.position.set(0, 0, 0); m.topPivot.rotation.set(0, 0, 0);
      if (m.toy) { m.toy.position.set(0, 0, 0); m.toy.rotation.set(0, 0, 0); m.toy.scale.setScalar(TOY_R); }
      if (c.state === 'open') {
        const t = c.t;
        // out of the alcove toward the player, turning upright
        const out = easeOut(clamp01(t / 0.35));
        m.g.position.set(c.x, c.y + 0.85 * out, c.z + 2.0 * out);
        m.roll.rotation.z = wrapAngle(c.roll) * (1 - out);
        m.spin.rotation.set(wrapAngle(c.rx) * (1 - out), wrapAngle(c.ry) * (1 - out), wrapAngle(c.rz) * (1 - out));
        const lid = easeOut(clamp01((t - 0.35) / 0.3));
        m.topPivot.position.set(lid * 0.3, lid * 0.36, 0);
        m.topPivot.rotation.z = -lid * 0.9;
        const pop = clamp01((t - 0.45) / 0.45);
        if (m.toy) {
          m.toy.scale.setScalar(TOY_R * (1 + easeOutBack(pop) * 3.2));
          m.toy.position.y = easeOut(pop) * 0.75;
          m.toy.rotation.y = pop * Math.PI * 2;
        }
        const leave = clamp01((t - 1.25) / (OPEN_TIME - 1.25));
        m.g.scale.setScalar(Math.max(0.001, 1 - leave * leave));
        m.g.position.y += leave * 1.2;
        if (!m.popped && t >= 0.45) { m.popped = true; burst(m.g.position.x, m.g.position.y + 0.8, m.g.position.z); }
      }
    }
    for (const [id, m] of meshes) {
      if (!seen.has(id)) { scene.remove(m.g); meshes.delete(id); }
    }
    stepSparkles(dt);
  }

  return {
    update,
    // Capsules that can be tapped right now.
    targets() {
      const out = [];
      for (const c of capsules.trayReady()) { const m = meshes.get(c.id); if (m) out.push(m.g); }
      return out;
    },
    destroy() {
      for (const m of meshes.values()) scene.remove(m.g);
      for (const m of shellMats.values()) { m.bottom.dispose(); m.top.dispose(); }
      for (const m of blobMats.values()) m.dispose();
      bottomGeo.dispose(); topGeo.dispose(); ringGeo.dispose(); blobGeo.dispose(); ringMat.dispose(); sparkleBase.dispose();
      for (const s of sparkles) { s.pts.geometry.dispose(); s.pts.material.dispose(); }
    },
  };
}
