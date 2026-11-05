import { Badge, Card } from '@paws/ui';
import { describeResult } from '../game/spec.js';

const HINT = { idle: 'Press the button to start the counter.', running: 'Stop it on exactly 1000.' };

function badgeFor(result) {
  if (!result) return null;
  if (result.win) return { tone: 'win', label: 'Winner' };
  if (result.reason === 'timeout') return { tone: 'miss', label: 'Too late' };
  return { tone: 'miss', label: `${Math.abs(result.diff)} ${result.diff < 0 ? 'short' : 'over'}` };
}

function Stat({ label, value, className }) {
  return (
    <div>
      <dt className="text-xs font-bold tracking-wider text-text-muted uppercase">{label}</dt>
      <dd className={'m-0 font-display text-lg tabular-nums ' + className}>{value}</dd>
    </div>
  );
}

export default function ResultCard({ phase, result, progress }) {
  const finished = phase === 'won' || phase === 'missed';
  const badge = finished ? badgeFor(result) : null;
  const tone = phase === 'won' ? 'text-feedback-win' : phase === 'missed' ? 'text-feedback-miss' : 'text-text-default';
  return (
    <Card data-screen="result">
      <div className="grid min-h-14 content-start justify-items-start gap-1.5">
        {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
        <p data-role="result" aria-live="polite" className={'m-0 text-lg leading-snug font-extrabold ' + tone}>
          {finished ? describeResult(result) : HINT[phase]}
        </p>
      </div>
      <dl data-screen="scores" className="m-0 grid grid-cols-3 gap-2 text-center">
        <Stat label="Attempts" value={progress.attempts} className="text-accent-trim" />
        <Stat label="Wins" value={progress.wins} className="text-accent-glow" />
        <Stat label="Closest miss" value={progress.closest === null ? '–' : progress.closest} className="text-feedback-miss" />
      </dl>
    </Card>
  );
}
