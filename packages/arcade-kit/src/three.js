// Small Three.js building blocks.

import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function box(w, h, d, mat) { return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); }
export function rbox(w, h, d, mat, r = 0.1) { return new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, r), mat); }
export function sphere(r, mat, seg = 16) { return new THREE.Mesh(new THREE.SphereGeometry(r, seg, Math.max(8, Math.floor(seg * 0.75))), mat); }
export function std(color, extra = {}) { return new THREE.MeshStandardMaterial({ color, roughness: 0.9, ...extra }); }
export function at(mesh, x, y, z) { mesh.position.set(x, y, z); return mesh; }

export function disposeObject(o) {
  o.traverse((c) => {
    if (c.geometry) c.geometry.dispose();
    if (c.material) {
      for (const m of Array.isArray(c.material) ? c.material : [c.material]) {
        if (m.map) m.map.dispose();
        m.dispose();
      }
    }
  });
}
