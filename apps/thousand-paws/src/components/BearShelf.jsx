import { BEARS } from '../game/spec.js';
import BearFace from './BearFace.jsx';

export default function BearShelf({ unlocked }) {
  return (
    <section className="rounded-2xl border border-[var(--shelf-wood)] bg-violet-900/60 p-3.5">
      <h2 className="m-0 mb-2.5 flex items-baseline justify-between font-display text-sm font-normal tracking-wide text-amber-300">
        Your shelf
        <span className="font-body text-xs font-bold text-violet-300">{unlocked.length} of {BEARS.length}</span>
      </h2>
      <ul className="m-0 grid list-none grid-cols-4 gap-2 p-0">
        {BEARS.map((bear) => {
          const has = unlocked.includes(bear.id);
          return (
            <li
              key={bear.id}
              data-bear={bear.id}
              data-locked={!has}
              className={'grid justify-items-center gap-1 rounded-xl p-1.5 text-center ' + (has ? 'bg-violet-800/70' : 'bg-slate-900/60')}
            >
              <BearFace bear={bear} locked={!has} />
              <span className={'text-[11px] leading-tight font-extrabold ' + (has ? 'text-amber-50' : 'text-slate-400')}>{bear.name}</span>
              <span className="sr-only">{has ? 'unlocked' : 'locked'}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
