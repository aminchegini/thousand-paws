// Cabinet finishes. A skin restyles the machine without changing its shape: body and
// trim finishes, marquee and playfield artwork, display colours and the room it stands
// in. Draw functions take a 2D canvas context and its size. Plain data, no DOM at import.

const CHECK = (x, w, h, a, b, n) => {
  const s = w / n;
  for (let j = 0; j * s < h; j++) for (let i = 0; i < n; i++) {
    x.fillStyle = (i + j) % 2 ? a : b;
    x.fillRect(i * s, j * s, s + 1, s + 1);
  }
};

const TAGLINE = 'S K I L L   C R A N E   ·   E V E R Y   P L A Y   W I N S';

// Walnut grain, used as a texture on the cabinet and on the side panels.
export function drawWood(x, w, h) {
  x.fillStyle = '#6a4125'; x.fillRect(0, 0, w, h);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed % 1000) / 1000; };
  for (let i = 0; i < 150; i++) {
    const gx = rnd() * w, wob = 4 + rnd() * 16, phase = rnd() * 6.28;
    x.strokeStyle = rnd() > 0.5 ? `rgba(42,22,10,${0.12 + rnd() * 0.3})` : `rgba(164,108,62,${0.08 + rnd() * 0.2})`;
    x.lineWidth = 0.6 + rnd() * 2.4;
    x.beginPath();
    for (let y = 0; y <= h; y += 12) {
      const px = gx + Math.sin(y * 0.012 + phase) * wob;
      if (y === 0) x.moveTo(px, y); else x.lineTo(px, y);
    }
    x.stroke();
  }
}

export const SKINS = [
  {
    id: 'candy',
    name: 'Candy Arcade',
    taste: 'Playful',
    finish: 'Gloss pink laminate with yellow edge trim, mint hardware and a confetti carpet.',
    swatch: ['#ff3f94', '#ffd23f', '#2ad4bd'],
    fonts: ['64px Bungee'],
    body: { color: 0xff3f94, roughness: 0.32 },
    bodyAlt: { color: 0xff3f94, roughness: 0.32 },
    trim: { color: 0xffd23f, roughness: 0.4 },
    accent: { color: 0x2ad4bd, roughness: 0.42 },
    panel: { color: 0x2a0f3a, roughness: 0.55 },
    chuteWall: { color: 0x2ad4bd, roughness: 0.5 },
    fieldFloor: { color: 0xc9a0ea, roughness: 0.9 },
    service: { color: 0xc42a6f, roughness: 0.45 },
    bayBack: { color: 0x38225c, roughness: 0.9 },
    crownInner: { color: 0x2a0f3a, roughness: 0.5, emissive: 0x7a2bb0, emissiveIntensity: 0.5 },
    ball: { color: 0xff3b30, roughness: 0.25 },
    button: { color: 0xff2d20, roughness: 0.28, emissive: 0xff2010 },
    bulb: { color: 0x332200, emissive: 0xffd76a },
    strip: 0xfff7ee,
    led: { color: '#ff9f1c', dim: '#3a2208' },
    sign: { color: '#2ad4bd', dim: '#0d3a33' },
    plate: { color: '#ffd23f', bg: '#2a0f3a', font: '400 %px Bungee, Impact, sans-serif' },
    tag: { color: '#ffd23f', bg: '#2a0f3a' },
    moveText: '#2ad4bd',
    dropText: '#ffd23f',
    room: { bg: 0x0c0820, fog: [62, 150], repeat: 14, roughness: 1, hemi: 0.7, key: 1.1, sun: 1.35, env: 0.28 },
    page: { bg: '#0c0820', panel: '#150e2b', card: '#1f1538', line: '#352652', muted: '#b9acd3', trim: '#ffd23f', trimDeep: '#b38a00', mint: '#2ad4bd', mintDeep: '#139b8a' },
    floor(x, w, h) {
      x.fillStyle = '#17103a'; x.fillRect(0, 0, w, h);
      const dots = ['rgba(42,212,189,.5)', 'rgba(255,79,154,.5)', 'rgba(255,210,63,.42)', 'rgba(140,120,255,.5)'];
      for (let i = 0; i < 90; i++) {
        x.fillStyle = dots[i % dots.length];
        x.beginPath(); x.arc((i * 197) % w, (i * 311) % h, 5 + (i % 4) * 3, 0, Math.PI * 2); x.fill();
      }
    },
    backWall(x, w, h) {
      x.fillStyle = '#ffd9ee'; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,0.6)';
      for (let i = 0; i < w; i += w / 16) x.fillRect(i, 0, w / 42, h);
    },
    decal(x, w, h) {
      const g = x.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, '#ff5fa2'); g.addColorStop(1, '#c42a6f');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,210,63,.9)';
      x.beginPath(); x.moveTo(0, h * 0.62); x.lineTo(w, h * 0.3); x.lineTo(w, h * 0.46); x.lineTo(0, h * 0.78); x.closePath(); x.fill();
      x.fillStyle = 'rgba(42,212,189,.9)';
      x.beginPath(); x.moveTo(0, h * 0.8); x.lineTo(w, h * 0.48); x.lineTo(w, h * 0.56); x.lineTo(0, h * 0.88); x.closePath(); x.fill();
    },
    marquee(x, w, h) {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#34124a'); g.addColorStop(1, '#1d0a2b');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `400 ${Math.round(h * 0.52)}px Bungee, "Arial Black", Impact, sans-serif`;
      x.fillStyle = '#8a5a00'; x.fillText('PLUSH GRAB', w / 2, h * 0.47);
      x.shadowColor = '#ffd23f'; x.shadowBlur = h * 0.08;
      x.fillStyle = '#ffd23f'; x.fillText('PLUSH GRAB', w / 2, h * 0.44);
      x.shadowBlur = 0;
      x.font = `800 ${Math.round(h * 0.13)}px Nunito, Arial, sans-serif`;
      x.fillStyle = '#2ad4bd'; x.fillText(TAGLINE, w / 2, h * 0.84);
    },
  },
  {
    id: 'neon',
    name: 'Neon Night',
    taste: 'Edgy',
    finish: 'Matte midnight-purple laminate with magenta and cyan LED edge lighting and a synthwave sunset.',
    swatch: ['#0e0b16', '#ff2bd6', '#22e6ff'],
    fonts: ['64px Monoton'],
    body: { color: 0x241d38, roughness: 0.5, metalness: 0.2 },
    bodyAlt: { color: 0x241d38, roughness: 0.5, metalness: 0.2 },
    trim: { color: 0x14000f, roughness: 0.5, emissive: 0xff2bd6, emissiveIntensity: 1.7 },
    accent: { color: 0x00141a, roughness: 0.5, emissive: 0x22e6ff, emissiveIntensity: 1.4 },
    panel: { color: 0x17121f, roughness: 0.45, metalness: 0.2 },
    chuteWall: { color: 0x1a1430, roughness: 0.5 },
    fieldFloor: { color: 0x2a1d52, roughness: 0.75 },
    service: { color: 0x1a1526, roughness: 0.5 },
    bayBack: { color: 0x120d22, roughness: 0.9 },
    crownInner: { color: 0x0a0612, roughness: 0.5, emissive: 0xff2bd6, emissiveIntensity: 0.55 },
    ball: { color: 0x22e6ff, roughness: 0.2, emissive: 0x0a5a6a },
    button: { color: 0xff2bd6, roughness: 0.25, emissive: 0xff2bd6 },
    bulb: { color: 0x001018, emissive: 0x22e6ff },
    strip: 0xe6d8ff,
    led: { color: '#22e6ff', dim: '#0a3540' },
    sign: { color: '#ff5ce0', dim: '#40123a' },
    plate: { color: '#22e6ff', bg: '#0a0612', font: '400 %px Monoton, Impact, sans-serif' },
    tag: { color: '#ff5ce0', bg: '#0a0612' },
    moveText: '#22e6ff',
    dropText: '#ff5ce0',
    room: { bg: 0x05040c, fog: [60, 140], repeat: 18, roughness: 0.55, hemi: 0.55, key: 0.95, sun: 1.3, env: 0.26 },
    page: { bg: '#05040c', panel: '#0d0a18', card: '#151024', line: '#33254f', muted: '#a99fc4', trim: '#ff5ce0', trimDeep: '#a01a8a', mint: '#22e6ff', mintDeep: '#0a93a8' },
    floor(x, w, h) {
      x.fillStyle = '#07060f'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(255,43,214,.6)'; x.lineWidth = 3;
      x.strokeRect(0, 0, w, h);
      x.strokeStyle = 'rgba(34,230,255,.35)'; x.lineWidth = 2;
      x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.moveTo(0, h / 2); x.lineTo(w, h / 2); x.stroke();
    },
    backWall(x, w, h) {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#120a2e'); g.addColorStop(0.55, '#5a1a78'); g.addColorStop(1, '#ff2bd6');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      const r = h * 0.3, cy = h * 0.5;
      const sun = x.createLinearGradient(0, cy - r, 0, cy + r);
      sun.addColorStop(0, '#ffe45c'); sun.addColorStop(1, '#ff4fa8');
      x.fillStyle = sun; x.beginPath(); x.arc(w / 2, cy, r, 0, Math.PI * 2); x.fill();
      x.fillStyle = '#5a1a78';
      for (let i = 0; i < 6; i++) x.fillRect(w / 2 - r, cy + r * (0.05 + i * 0.16), r * 2, r * (0.03 + i * 0.016));
      x.strokeStyle = 'rgba(34,230,255,.75)'; x.lineWidth = 2.5;
      for (let i = -14; i <= 14; i++) { x.beginPath(); x.moveTo(w / 2 + i * 12, h * 0.72); x.lineTo(w / 2 + i * 90, h); x.stroke(); }
      for (let i = 0; i < 6; i++) { const y = h * 0.72 + (i * i) * h * 0.0115; x.beginPath(); x.moveTo(0, y); x.lineTo(w, y); x.stroke(); }
    },
    decal(x, w, h) {
      x.fillStyle = '#1b1530'; x.fillRect(0, 0, w, h);
      x.lineWidth = w * 0.014; x.shadowBlur = w * 0.05;
      for (const [c, off] of [['#ff2bd6', 0.5], ['#22e6ff', 0.6], ['#ff2bd6', 0.7]]) {
        x.strokeStyle = c; x.shadowColor = c;
        x.beginPath(); x.moveTo(0, h * (off + 0.2)); x.lineTo(w, h * (off - 0.2)); x.stroke();
      }
      x.shadowBlur = 0;
    },
    marquee(x, w, h) {
      x.fillStyle = '#07040f'; x.fillRect(0, 0, w, h);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `400 ${Math.round(h * 0.5)}px Monoton, Impact, sans-serif`;
      x.shadowColor = '#ff2bd6'; x.shadowBlur = h * 0.11;
      x.fillStyle = '#ff9df0'; x.fillText('PLUSH GRAB', w / 2, h * 0.44, w * 0.96);
      x.shadowBlur = 0;
      x.font = `800 ${Math.round(h * 0.13)}px Nunito, Arial, sans-serif`;
      x.shadowColor = '#22e6ff'; x.shadowBlur = h * 0.05;
      x.fillStyle = '#22e6ff'; x.fillText(TAGLINE, w / 2, h * 0.84);
      x.shadowBlur = 0;
    },
  },
  {
    id: 'diner',
    name: 'Retro Diner',
    taste: 'Nostalgic',
    finish: 'Cherry red enamel with a cream head, polished chrome trim and a checkerboard floor.',
    swatch: ['#c8202f', '#f6ecd6', '#c9ced6'],
    fonts: ['64px Pacifico'],
    body: { color: 0xc8202f, roughness: 0.22 },
    bodyAlt: { color: 0xf3e6cb, roughness: 0.3 },
    trim: { color: 0xe6e9ef, metalness: 1, roughness: 0.16 },
    accent: { color: 0x4fb8a8, roughness: 0.35 },
    panel: { color: 0x22282e, roughness: 0.4 },
    chuteWall: { color: 0x4fb8a8, roughness: 0.4 },
    fieldFloor: { color: 0xf3e6cb, roughness: 0.6 },
    service: { color: 0x9c1824, roughness: 0.4 },
    bayBack: { color: 0x1f3a40, roughness: 0.85 },
    crownInner: { color: 0xc8202f, roughness: 0.35, emissive: 0x4a0a10, emissiveIntensity: 0.5 },
    ball: { color: 0xf3e6cb, roughness: 0.2 },
    button: { color: 0xd8222f, roughness: 0.22, emissive: 0xc01a26 },
    bulb: { color: 0x2a1a00, emissive: 0xffe9b0 },
    strip: 0xfff3dc,
    led: { color: '#ff5a4d', dim: '#3a1210' },
    sign: { color: '#7ef0dd', dim: '#123a34' },
    plate: { color: '#f6ecd6', bg: '#22282e', font: 'italic 400 %px Pacifico, "Brush Script MT", cursive' },
    tag: { color: '#f6ecd6', bg: '#c8202f' },
    moveText: '#f6ecd6',
    dropText: '#f6ecd6',
    room: { bg: 0x1a2228, fog: [64, 160], repeat: 36, roughness: 0.32, hemi: 0.8, key: 1.15, sun: 1.3, env: 0.5 },
    page: { bg: '#141a1f', panel: '#1c242a', card: '#253037', line: '#3b4a53', muted: '#b5c2c6', trim: '#f6ecd6', trimDeep: '#b5a789', mint: '#4fb8a8', mintDeep: '#2f8275' },
    floor(x, w, h) { CHECK(x, w, h, '#f1ece2', '#191b1f', 2); },
    backWall(x, w, h) {
      x.fillStyle = '#6fc7b8'; x.fillRect(0, 0, w, h);
      x.fillStyle = 'rgba(255,255,255,.75)';
      for (let i = 0; i < 26; i++) {
        const cx = (i * 271) % w, cy = (i * 139) % (h * 0.72), s = 8 + (i % 3) * 5;
        x.beginPath();
        for (let k = 0; k < 8; k++) {
          const a = (k / 8) * Math.PI * 2, r = k % 2 ? s * 0.28 : s;
          x.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
        }
        x.closePath(); x.fill();
      }
      x.save(); x.translate(0, h * 0.76); CHECK(x, w, h * 0.24, '#191b1f', '#f1ece2', 16); x.restore();
    },
    decal(x, w, h) {
      x.fillStyle = '#c8202f'; x.fillRect(0, 0, w, h);
      for (let i = 0; i < 3; i++) {
        const y = h * (0.44 + i * 0.09), g = x.createLinearGradient(0, y, 0, y + h * 0.05);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#9aa1ab'); g.addColorStop(1, '#eef0f4');
        x.fillStyle = g; x.fillRect(0, y, w * (1 - i * 0.16), h * 0.05);
      }
    },
    marquee(x, w, h) {
      x.fillStyle = '#c8202f'; x.fillRect(0, 0, w, h);
      x.fillStyle = '#f6ecd6'; x.fillRect(0, h * 0.72, w, h * 0.28);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `400 ${Math.round(h * 0.54)}px Pacifico, "Brush Script MT", cursive`;
      x.fillStyle = '#6e0f18'; x.fillText('Plush Grab', w / 2 + h * 0.015, h * 0.38 + h * 0.025);
      x.fillStyle = '#fff6e4'; x.fillText('Plush Grab', w / 2, h * 0.38);
      x.font = `800 ${Math.round(h * 0.125)}px Nunito, Arial, sans-serif`;
      x.fillStyle = '#22282e'; x.fillText(TAGLINE, w / 2, h * 0.86);
    },
  },
  {
    id: 'walnut',
    name: 'Walnut & Brass',
    taste: 'Refined',
    finish: 'Walnut veneer with brushed brass trim, a bronze panel and a quiet cream playfield.',
    swatch: ['#6a4125', '#c39a4e', '#e7dcc6'],
    fonts: ['700 64px "Playfair Display"'],
    body: { wood: true, color: 0xffffff, roughness: 0.5 },
    bodyAlt: { wood: true, color: 0xd9c8b4, roughness: 0.5 },
    trim: { color: 0xc39a4e, metalness: 1, roughness: 0.34 },
    accent: { color: 0xc39a4e, metalness: 0.9, roughness: 0.42 },
    panel: { color: 0x2a211a, roughness: 0.42, metalness: 0.25 },
    chuteWall: { color: 0xd8cbb0, roughness: 0.7 },
    fieldFloor: { color: 0xe7dcc6, roughness: 0.95 },
    service: { color: 0x4a2e1b, roughness: 0.5 },
    bayBack: { color: 0x2e241b, roughness: 0.9 },
    crownInner: { color: 0x2a211a, roughness: 0.45, metalness: 0.25 },
    ball: { color: 0xc39a4e, metalness: 1, roughness: 0.28 },
    button: { color: 0x7d1f24, roughness: 0.3, emissive: 0x7a1218 },
    bulb: { color: 0x2a1c08, emissive: 0xffdca0 },
    strip: 0xfff0d6,
    led: { color: '#ffd9a0', dim: '#3a2c18' },
    sign: { color: '#e8c583', dim: '#3a2e17' },
    plate: { color: '#e8c583', bg: '#2a211a', font: '700 %px "Playfair Display", Georgia, serif' },
    tag: { color: '#e8c583', bg: '#2a211a' },
    moveText: '#e8c583',
    dropText: '#e8c583',
    room: { bg: 0x17120e, fog: [62, 150], repeat: 16, roughness: 0.62, hemi: 0.72, key: 1.05, sun: 1.25, env: 0.38 },
    page: { bg: '#120e0b', panel: '#1b1612', card: '#26201a', line: '#40362b', muted: '#c2b6a3', trim: '#c39a4e', trimDeep: '#7f6329', mint: '#e8c583', mintDeep: '#a98c52' },
    floor(x, w, h) {
      x.fillStyle = '#4a4239'; x.fillRect(0, 0, w, h);
      let seed = 11;
      const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed % 1000) / 1000; };
      for (let i = 0; i < 900; i++) {
        x.fillStyle = rnd() > 0.5 ? 'rgba(255,240,220,.05)' : 'rgba(0,0,0,.08)';
        x.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 3, 1 + rnd() * 3);
      }
      x.strokeStyle = 'rgba(20,14,8,.45)'; x.lineWidth = 2; x.strokeRect(0, 0, w, h);
    },
    backWall(x, w, h) {
      x.fillStyle = '#efe6d3'; x.fillRect(0, 0, w, h);
      x.strokeStyle = 'rgba(155,120,60,.3)'; x.lineWidth = 1.5;
      for (let i = 0; i < w; i += w / 34) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, h); x.stroke(); }
      x.strokeStyle = '#c39a4e'; x.lineWidth = 5; x.strokeRect(w * 0.05, h * 0.06, w * 0.9, h * 0.88);
    },
    decal(x, w, h) {
      drawWood(x, w, h);
      x.strokeStyle = '#c39a4e'; x.lineWidth = w * 0.012;
      x.strokeRect(w * 0.1, h * 0.09, w * 0.8, h * 0.82);
      x.lineWidth = w * 0.005;
      x.strokeRect(w * 0.13, h * 0.115, w * 0.74, h * 0.77);
    },
    marquee(x, w, h) {
      const g = x.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#2c2219'); g.addColorStop(1, '#1b140e');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      x.strokeStyle = '#c39a4e'; x.lineWidth = h * 0.016; x.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h * 0.9);
      x.textAlign = 'center'; x.textBaseline = 'middle';
      x.font = `700 ${Math.round(h * 0.46)}px "Playfair Display", Georgia, serif`;
      x.fillStyle = '#e8c583'; x.fillText('Plush Grab', w / 2, h * 0.42);
      x.font = `700 ${Math.round(h * 0.105)}px Nunito, Arial, sans-serif`;
      x.fillStyle = '#c2b08d'; x.fillText(TAGLINE, w / 2, h * 0.8);
    },
  },
];

export const skinById = (id) => SKINS.find((s) => s.id === id) || SKINS[0];
