// Plush toy drawing routines. Everything is drawn at the origin with radius r,
// so callers translate/rotate first. Works on any 2D canvas context.

export const INK = '#2a0f3a';

export const KINDS = [
  ['bear', ['#c98a5b', '#e7b48a', '#8c5a3c', '#f0cfa8']],
  ['bunny', ['#f6f1ff', '#ffc9e3', '#cdbcff', '#bfe9ff']],
  ['cat', ['#ffb14a', '#a9b2c3', '#ffffff', '#4a4d66']],
  ['duck', ['#ffe14d', '#ffd12e']],
  ['frog', ['#6fd36f', '#9be05a', '#3fbf8f']],
];

export function hexRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export function mix(a, b, t) {
  const A = hexRgb(a), B = hexRgb(b);
  return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * t)).join(',')})`;
}

export function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.closePath(); }
export function ell(c, x, y, rx, ry, rot) { c.beginPath(); c.ellipse(x, y, rx, ry, rot || 0, 0, Math.PI * 2); c.closePath(); }
export function rrect(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r);
  c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r);
  c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y);
  c.closePath();
}

export function drawPlush(c, kind, col, r) {
  c.lineWidth = Math.max(1.4, r * 0.09);
  c.strokeStyle = 'rgba(42,15,58,.6)';
  c.lineJoin = 'round';
  c.lineCap = 'round';
  const lite = mix(col, '#ffffff', 0.5);
  const deep = mix(col, '#2a0f3a', 0.3);

  const body = () => {
    const g = c.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r * 1.05);
    g.addColorStop(0, mix(col, '#ffffff', 0.35)); g.addColorStop(0.65, col); g.addColorStop(1, deep);
    c.fillStyle = g; circ(c, 0, 0, r); c.fill(); c.stroke();
  };
  const eyes = (dx, dy) => {
    c.fillStyle = INK; circ(c, -dx, dy, r * 0.095); c.fill(); circ(c, dx, dy, r * 0.095); c.fill();
    c.fillStyle = '#fff';
    circ(c, -dx + r * 0.035, dy - r * 0.035, r * 0.035); c.fill();
    circ(c, dx + r * 0.035, dy - r * 0.035, r * 0.035); c.fill();
  };
  const blush = () => {
    c.fillStyle = 'rgba(255,110,160,.35)';
    ell(c, -r * 0.5, r * 0.18, r * 0.16, r * 0.1); c.fill();
    ell(c, r * 0.5, r * 0.18, r * 0.16, r * 0.1); c.fill();
  };

  if (kind === 'bear') {
    for (const s of [-1, 1]) {
      c.fillStyle = col; circ(c, s * r * 0.66, -r * 0.66, r * 0.34); c.fill(); c.stroke();
      c.fillStyle = lite; circ(c, s * r * 0.66, -r * 0.66, r * 0.17); c.fill();
    }
    body();
    c.fillStyle = lite; ell(c, 0, r * 0.3, r * 0.42, r * 0.32); c.fill();
    eyes(r * 0.3, -r * 0.1);
    c.fillStyle = INK; ell(c, 0, r * 0.2, r * 0.13, r * 0.09); c.fill();
    c.strokeStyle = INK; c.lineWidth = r * 0.06; c.beginPath();
    c.moveTo(0, r * 0.28); c.lineTo(0, r * 0.38);
    c.moveTo(-r * 0.14, r * 0.42); c.quadraticCurveTo(0, r * 0.52, r * 0.14, r * 0.42);
    c.stroke();
  } else if (kind === 'bunny') {
    for (const s of [-1, 1]) {
      c.fillStyle = col; ell(c, s * r * 0.36, -r * 0.98, r * 0.2, r * 0.58, s * 0.18); c.fill(); c.stroke();
      c.fillStyle = '#ffb3cf'; ell(c, s * r * 0.36, -r * 0.95, r * 0.09, r * 0.38, s * 0.18); c.fill();
    }
    body(); eyes(r * 0.3, -r * 0.08); blush();
    c.fillStyle = '#ff7fae'; ell(c, 0, r * 0.18, r * 0.1, r * 0.07); c.fill();
    c.strokeStyle = INK; c.lineWidth = r * 0.05; c.beginPath();
    for (const s of [-1, 1]) {
      c.moveTo(s * r * 0.2, r * 0.2); c.lineTo(s * r * 0.6, r * 0.12);
      c.moveTo(s * r * 0.2, r * 0.28); c.lineTo(s * r * 0.6, r * 0.34);
    }
    c.stroke();
  } else if (kind === 'cat') {
    for (const s of [-1, 1]) {
      c.fillStyle = col; c.beginPath();
      c.moveTo(s * r * 0.3, -r * 0.8); c.lineTo(s * r * 0.9, -r * 1.0); c.lineTo(s * r * 0.88, -r * 0.3);
      c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#ffb3cf'; c.beginPath();
      c.moveTo(s * r * 0.45, -r * 0.72); c.lineTo(s * r * 0.8, -r * 0.85); c.lineTo(s * r * 0.78, -r * 0.45);
      c.closePath(); c.fill();
    }
    body(); eyes(r * 0.32, -r * 0.1);
    c.fillStyle = '#ff7fae'; c.beginPath();
    c.moveTo(-r * 0.09, r * 0.14); c.lineTo(r * 0.09, r * 0.14); c.lineTo(0, r * 0.25); c.closePath(); c.fill();
    c.strokeStyle = INK; c.lineWidth = r * 0.05; c.beginPath();
    for (const s of [-1, 1]) for (let k = -1; k <= 1; k++) {
      c.moveTo(s * r * 0.22, r * 0.2 + k * r * 0.08); c.lineTo(s * r * 0.72, r * 0.16 + k * r * 0.14);
    }
    c.stroke();
  } else if (kind === 'duck') {
    body();
    c.fillStyle = deep; ell(c, -r * 0.25, r * 0.3, r * 0.42, r * 0.26, -0.3); c.fill();
    c.fillStyle = '#ff8c1a'; c.beginPath();
    c.moveTo(r * 0.25, -r * 0.02); c.quadraticCurveTo(r * 0.95, -r * 0.12, r * 0.98, r * 0.08);
    c.quadraticCurveTo(r * 0.9, r * 0.3, r * 0.25, r * 0.24); c.closePath(); c.fill(); c.stroke();
    eyes(r * 0.28, -r * 0.3);
    c.strokeStyle = INK; c.lineWidth = r * 0.06; c.beginPath();
    c.moveTo(-r * 0.1, -r * 0.98); c.quadraticCurveTo(-r * 0.05, -r * 1.25, r * 0.15, -r * 1.2);
    c.moveTo(0, -r * 1.0); c.quadraticCurveTo(r * 0.2, -r * 1.3, r * 0.35, -r * 1.15);
    c.stroke();
  } else {
    body();
    for (const s of [-1, 1]) {
      c.fillStyle = col; circ(c, s * r * 0.45, -r * 0.78, r * 0.32); c.fill(); c.stroke();
      c.fillStyle = '#fff'; circ(c, s * r * 0.45, -r * 0.78, r * 0.2); c.fill();
      c.fillStyle = INK; circ(c, s * r * 0.42, -r * 0.76, r * 0.1); c.fill();
    }
    blush();
    c.strokeStyle = INK; c.lineWidth = r * 0.07; c.beginPath();
    c.moveTo(-r * 0.5, r * 0.15); c.quadraticCurveTo(0, r * 0.6, r * 0.5, r * 0.15); c.stroke();
  }
}
