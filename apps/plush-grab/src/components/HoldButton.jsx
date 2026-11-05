// A button that reports "held down" for as long as the pointer (or Space/Enter) is down.

export default function HoldButton({ label, down, onChange, children }) {
  const press = (e) => {
    e.preventDefault();
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* not supported */ }
    onChange(true);
  };
  const release = () => onChange(false);
  return (
    <button
      type="button"
      className={'key' + (down ? ' is-down' : '')}
      aria-label={label}
      aria-pressed={down}
      onPointerDown={press}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); onChange(true); } }}
      onKeyUp={(e) => { if (e.key === ' ' || e.key === 'Enter') onChange(false); }}
      onBlur={release}
    >
      {children}
    </button>
  );
}
