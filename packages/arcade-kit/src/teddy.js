// A sitting teddy bear built from spheres. The origin is where it sits, it faces +z and
// stands about 2.1 units tall at scale 1.

import * as THREE from 'three';
import { sphere, std } from './three.js';

const INK = 0x2a0f3a;
const LOCKED = { fur: 0x8a8794, belly: 0xb9b6c2, bow: 0x6f6c7a };

export function makeTeddy({ fur, belly, bow, metalness = 0 }) {
  const colors = { fur, belly, bow };
  const furMat = std(fur, { roughness: 0.92 - metalness * 0.6, metalness });
  const bellyMat = std(belly, { roughness: 0.92 - metalness * 0.6, metalness });
  const bowMat = std(bow, { roughness: 0.55 });
  const ink = std(INK, { roughness: 0.5 });
  const group = new THREE.Group();
  const put = (mesh, x, y, z, sx = 1, sy = 1, sz = 1) => {
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); mesh.castShadow = true; group.add(mesh); return mesh;
  };

  put(sphere(0.62, furMat, 28), 0, 0.64, 0, 1, 1.08, 0.92);                 // torso
  put(sphere(0.36, bellyMat, 24), 0, 0.84, 0.37, 1, 1, 0.5);                // belly patch, clear of the legs
  put(sphere(0.5, furMat, 28), 0, 1.54, 0.04);                              // head
  put(sphere(0.23, bellyMat, 18), 0, 1.43, 0.42, 1.1, 0.8, 0.72);           // muzzle
  put(sphere(0.065, ink, 10), 0, 1.48, 0.6, 1.3, 0.9, 0.8);                 // nose
  for (const s of [-1, 1]) {
    put(sphere(0.2, furMat, 16), s * 0.37, 1.93, 0);                        // ear
    put(sphere(0.11, bellyMat, 12), s * 0.37, 1.93, 0.13, 1, 1, 0.6);
    put(sphere(0.055, ink, 10), s * 0.18, 1.62, 0.45);                      // eye
    const arm = put(sphere(0.21, furMat, 16), s * 0.64, 0.9, 0.16, 0.85, 1.55, 0.85);
    arm.rotation.z = s * 0.55;
    put(sphere(0.25, furMat, 16), s * 0.36, 0.24, 0.5, 0.9, 0.9, 1.5);      // leg
    put(sphere(0.15, bellyMat, 12), s * 0.36, 0.26, 0.85, 1, 1, 0.4);       // foot pad
    const wing = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.28, 14), bowMat);
    wing.rotation.z = s * Math.PI / 2;
    put(wing, s * 0.17, 1.1, 0.5, 1, 1, 0.55);                              // bow tie
  }
  put(sphere(0.075, bowMat, 10), 0, 1.1, 0.53);

  return {
    group,
    // A locked bear keeps its shape but loses its colours.
    setLocked(locked) {
      const c = locked ? LOCKED : colors;
      furMat.color.set(c.fur); bellyMat.color.set(c.belly); bowMat.color.set(c.bow);
    },
    setColors(next) { Object.assign(colors, next); this.setLocked(false); },
  };
}
