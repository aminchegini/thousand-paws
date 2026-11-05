// Canvas-drawn textures: flat planes, text labels and the dot-matrix LED display.

import * as THREE from 'three';

export function canvasPlane(w, h, draw, { px = 128, lit = true, transparent = false } = {}) {
  const c = document.createElement('canvas');
  c.width = Math.max(2, Math.round((w / h) * px)); c.height = px;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  const mat = lit
    ? new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6, transparent })
    : new THREE.MeshBasicMaterial({ map: tex, toneMapped: false, transparent });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  const redraw = () => { ctx.clearRect(0, 0, c.width, c.height); draw(ctx, c.width, c.height); tex.needsUpdate = true; };
  redraw();
  return { mesh, redraw };
}

export function canvasTexture(w, h, draw, repeat = false) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return { tex, redraw() { ctx.clearRect(0, 0, w, h); draw(ctx, w, h); tex.needsUpdate = true; } };
}

export function label(w, h, text, opts = {}) {
  const style = { color: '#fff6e8', bg: null, font: '800 %px Nunito, Arial, sans-serif', scale: 0.62, ...opts };
  const p = canvasPlane(w, h, (x, cw, ch) => {
    if (style.bg) { x.fillStyle = style.bg; x.beginPath(); x.roundRect(0, 0, cw, ch, ch * 0.18); x.fill(); }
    x.fillStyle = style.color; x.font = style.font.replace('%', Math.round(ch * style.scale));
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, cw / 2, ch * 0.54, cw * 0.94);
  }, { transparent: true });
  document.fonts?.ready.then(p.redraw);
  p.mesh.userData.restyle = (o) => { Object.assign(style, o); p.redraw(); };
  return p.mesh;
}

// A dot-matrix style LED display: one main line, an optional smaller second line, optional blink.
export function makeLed(w, h, { color = '#ff9f1c', dim = '#3a2208', twoLines = false } = {}) {
  let main = '', sub = '', blink = false, on = true, t = 0;
  const p = canvasPlane(w, h, (x, cw, ch) => {
    x.fillStyle = '#100813'; x.fillRect(0, 0, cw, ch);
    x.fillStyle = 'rgba(255,255,255,0.025)';
    for (let i = 0; i < cw; i += 6) x.fillRect(i, 0, 1, ch);
    for (let j = 0; j < ch; j += 6) x.fillRect(0, j, cw, 1);
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const fit = (text, size) => {
      let s = size;
      x.font = `${s}px VT323, "Courier New", monospace`;
      const width = x.measureText(text).width;
      if (width > cw * 0.94) { s = Math.floor(s * (cw * 0.94 / width)); x.font = `${s}px VT323, "Courier New", monospace`; }
    };
    const lit = !blink || on;
    fit(main, ch * (twoLines ? 0.56 : 0.8));
    x.fillStyle = lit ? color : dim;
    x.shadowColor = lit ? color : 'transparent'; x.shadowBlur = lit ? ch * 0.09 : 0;
    x.fillText(main, cw / 2, ch * (twoLines ? 0.34 : 0.52));
    if (twoLines) {
      fit(sub, ch * 0.34);
      x.fillStyle = color; x.shadowColor = color; x.shadowBlur = ch * 0.05;
      x.fillText(sub, cw / 2, ch * 0.78);
    }
    x.shadowBlur = 0;
  }, { px: 192, lit: false });
  document.fonts?.load('64px VT323').then(p.redraw).catch(() => {});
  return {
    mesh: p.mesh,
    set(text, doBlink = false) { if (text !== main || doBlink !== blink) { main = text; blink = doBlink; on = true; t = 0; p.redraw(); } },
    setSub(text) { if (text !== sub) { sub = text; p.redraw(); } },
    setColors(c, d) { color = c; dim = d; p.redraw(); },
    tick(dt) { if (!blink) return; t += dt; if (t > 0.45) { t = 0; on = !on; p.redraw(); } },
  };
}
