import { Badge, Card } from '@paws/ui';
import { BEARS } from '../game/spec.js';
import BearFace from './BearFace.jsx';

export default function BearShelf({ unlocked }) {
  const title = (
    <span className="flex items-center justify-between font-display font-normal">
      Your shelf
      <Badge tone={unlocked.length === BEARS.length ? 'win' : 'neutral'}>{unlocked.length} of {BEARS.length}</Badge>
    </span>
  );
  return (
    <Card data-screen="collection" title={title}>
      <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0">
        {BEARS.map((bear) => {
          const has = unlocked.includes(bear.id);
          return (
            <li
              key={bear.id}
              data-bear={bear.id}
              data-locked={!has}
              className={'grid justify-items-center gap-1 rounded-md p-1.5 text-center ' + (has ? 'bg-surface-panel' : 'bg-surface-page/60')}
            >
              <BearFace bear={bear} locked={!has} />
              <span className={'text-xs leading-tight font-extrabold ' + (has ? 'text-text-default' : 'text-text-muted')}>{bear.name}</span>
              <span className="sr-only">{has ? 'unlocked' : 'locked'}</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
