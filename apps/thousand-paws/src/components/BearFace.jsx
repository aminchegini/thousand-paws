const INK = '#2a0f3a';
const hex = (n) => '#' + n.toString(16).padStart(6, '0');

// A bear's face in its own colours, or in grey with a padlock while it is locked.
export default function BearFace({ bear, locked }) {
  const fur = locked ? '#5b5870' : hex(bear.fur);
  const belly = locked ? '#7d7a90' : hex(bear.belly);
  const bow = locked ? '#4a475c' : hex(bear.bow);
  return (
    <svg viewBox="0 0 64 64" width="48" height="48" aria-hidden="true">
      <circle cx="16" cy="16" r="9" fill={fur} />
      <circle cx="48" cy="16" r="9" fill={fur} />
      <circle cx="16" cy="16" r="4.5" fill={belly} />
      <circle cx="48" cy="16" r="4.5" fill={belly} />
      <circle cx="32" cy="31" r="21" fill={fur} />
      <ellipse cx="32" cy="38" rx="10" ry="8" fill={belly} />
      <circle cx="24" cy="27" r="2.6" fill={INK} />
      <circle cx="40" cy="27" r="2.6" fill={INK} />
      <ellipse cx="32" cy="34.5" rx="3.2" ry="2.3" fill={INK} />
      <path d="M32 56l-9-5v10zM32 56l9-5v10z" fill={bow} />
      <circle cx="32" cy="56" r="2.6" fill={bow} />
      {locked && (
        <g>
          <path d="M46 46v-4a4.5 4.5 0 0 1 9 0v4" fill="none" stroke="#ffd23f" strokeWidth="3" />
          <rect x="42.5" y="45" width="16" height="13" rx="3" fill="#ffd23f" />
        </g>
      )}
    </svg>
  );
}
