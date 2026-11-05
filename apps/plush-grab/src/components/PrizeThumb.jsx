import { useEffect, useRef } from 'react';
import { drawPlush } from '../game/plush.js';

// Thumbnail height in CSS pixels for each toy size, so the shelf shows them at scale.
export const THUMB_PX = { capsule: 46, small: 44, medium: 56, large: 70, jumbo: 86 };

export default function PrizeThumb({ kind, color, size = 'medium', shell }) {
  const ref = useRef(null);
  const px = THUMB_PX[size] || THUMB_PX.medium;
  useEffect(() => {
    const c = ref.current;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = px * dpr; c.height = px * dpr;
    const x = c.getContext('2d');
    x.setTransform(dpr, 0, 0, dpr, 0, 0);
    x.clearRect(0, 0, px, px);
    if (shell) {
      // a mini toy sitting in the bottom half of the capsule it came in
      const r = px * 0.26, cupR = r * 1.25, cupY = r * 0.45;
      x.translate(px / 2, px - cupY - cupR - 2);
      drawPlush(x, kind, color, r);
      x.beginPath(); x.arc(0, cupY, cupR, 0, Math.PI); x.closePath();
      x.fillStyle = shell; x.fill();
      x.lineWidth = 1.5; x.strokeStyle = 'rgba(42,15,58,.55)'; x.stroke();
      x.fillStyle = 'rgba(255,255,255,.9)'; x.fillRect(-cupR, cupY - 1.5, cupR * 2, 3);
    } else {
      const r = px * 0.3;
      x.translate(px / 2, px - r - 3);   // sit the toy on the bottom edge, room above for ears
      drawPlush(x, kind, color, r);
    }
  }, [kind, color, px, shell]);
  return (
    <canvas
      ref={ref}
      className="thumb"
      style={{ width: px, height: px }}
      role="img"
      aria-label={size === 'capsule' ? `mini ${kind} from a capsule` : `${size} ${kind} plush`}
      title={size === 'capsule' ? `Mini ${kind} (capsule)` : `${size[0].toUpperCase()}${size.slice(1)} ${kind}`}
    />
  );
}
