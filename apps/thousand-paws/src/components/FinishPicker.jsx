import { tokens } from '@paws/tokens';
import { Card } from '@paws/ui';
import { SKINS } from '../game/spec.js';

const SWATCH = ['color.cabinet.body', 'color.cabinet.trim', 'color.accent.glow'];

export default function FinishPicker({ skin, onChange }) {
  return (
    <Card data-screen="finish" title={<span className="font-display font-normal">Cabinet finish</span>}>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Cabinet finish">
        {SKINS.map((s) => (
          <button
            key={s.id}
            type="button"
            data-finish={s.id}
            aria-pressed={skin === s.id}
            onClick={() => onChange(s.id)}
            className="flex items-center gap-2 rounded-md border border-border-default bg-surface-panel px-2.5 py-2 text-left text-sm font-extrabold text-text-default aria-pressed:border-accent-glow"
          >
            <span className="flex gap-1" aria-hidden="true">
              {SWATCH.map((name) => <i key={name} className="block size-3 rounded-pill" style={{ background: tokens[s.id][name] }} />)}
            </span>
            {s.name}
          </button>
        ))}
      </div>
    </Card>
  );
}
