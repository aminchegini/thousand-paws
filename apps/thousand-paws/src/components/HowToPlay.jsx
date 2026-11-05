import { Button, Card } from '@paws/ui';

export default function HowToPlay({ sound, onToggleSound, confirmReset, onReset }) {
  return (
    <Card data-screen="how-to-play" title={<span className="font-display font-normal">How to play</span>}>
      <ul className="m-0 grid list-disc gap-1.5 pl-5 text-md text-text-muted">
        <li>Press the red button, or Space, to start the counter.</li>
        <li>It speeds up and slows down at random. Press again when it reads exactly 1000.</li>
        <li>Each win unlocks a bear, and the next 1000 goes by a little faster.</li>
        <li>Drag the background to look around. Scroll to zoom.</li>
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" aria-pressed={sound} onClick={onToggleSound}>Sound: {sound ? 'on' : 'off'}</Button>
        <Button variant="ghost" size="sm" onClick={onReset}>{confirmReset ? 'Press again to lock every bear' : 'Reset shelf'}</Button>
      </div>
    </Card>
  );
}
