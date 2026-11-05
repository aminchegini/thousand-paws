// Physical layout of the machine, shared by the simulations and the 3D model.
// One unit is 8 cm. y = 0 is the playfield floor; the machine stands on GROUND_Y.
// x runs left to right as you face the machine, +z points toward the player.

export const UNIT_CM = 8;
export const GROUND_Y = -11;

// Outer shell of the cabinet.
export const SHELL = {
  halfW: 5.6, front: 4.1, back: -4.1,
  plinthTop: -10.3,
  headBottom: 8, headTop: 10.4, crownTop: 11.9,
};

// Control panel: a wedge on the front of the cabinet, top surface sloping toward the player.
export const PANEL = {
  halfW: 5.4,
  backZ: 4.1, backY: -0.25,
  frontZ: 6.5, frontY: -1.0,
  noseZ: 6.72, chinY: -3.0,
};

// Claw prize door, lower left, directly under the playfield chute.
export const BIN = { x: -3.8, halfW: 1.3, y0: -9.7, y1: -6.5, floorY: -9.6, restZ: 2.9 };

// Always-win capsule bay, lower right: hopper and ramps behind a window, pickup alcove below.
export const BAY = {
  x0: 0.62, x1: 5.08,
  windowY0: -8.2, windowY1: -3.0,
  signY0: -8.85, signY1: -8.2,
  alcoveY0: -9.75, alcoveY1: -8.85,
  z: 3.15,          // capsule lane depth inside the bay
  trayZ: 3.4, trayY: -9.4,
  capR: 0.3,        // about a 48 mm capsule
};

// Card reader on the control panel. The price is a placeholder until the real one is set.
export const POS = { pricePerPlay: '$1.00' };

export function overallSizeCm() {
  return {
    w: Math.round(SHELL.halfW * 2 * UNIT_CM),
    d: Math.round((PANEL.noseZ - SHELL.back) * UNIT_CM),
    h: Math.round((SHELL.crownTop - GROUND_Y) * UNIT_CM),
  };
}
