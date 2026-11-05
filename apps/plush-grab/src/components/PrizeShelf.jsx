import PrizeThumb from './PrizeThumb.jsx';

export default function PrizeShelf({ prizes }) {
  const jumbos = prizes.filter((p) => p.size === 'jumbo').length;
  const capsules = prizes.filter((p) => p.size === 'capsule').length;
  const extras = [jumbos && `${jumbos} jumbo`, capsules && `${capsules} from capsules`].filter(Boolean);
  return (
    <section className="shelf" aria-label="Prizes you have won">
      <div className="shelfHead">
        <h2>Prize shelf</h2>
        {prizes.length > 0 && (
          <p className="tally">
            {prizes.length} {prizes.length === 1 ? 'toy' : 'toys'}{extras.map((e) => ` · ${e}`).join('')}
          </p>
        )}
      </div>
      <div className="shelfRow">
        {prizes.length === 0
          ? <p className="empty">Nothing yet. Line the claw up over a plush and press DROP.</p>
          : prizes.map((p) => (
            <div className="toy" key={p.id}>
              <PrizeThumb kind={p.kind} color={p.color} size={p.size} shell={p.shell} />
            </div>
          ))}
      </div>
    </section>
  );
}
