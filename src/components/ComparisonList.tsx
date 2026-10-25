import { conflictText, type compareAnswers } from '../compare';
export default function ComparisonList({ rows }: {
  rows: ReturnType<typeof compareAnswers>;
}) {
  return <div className="comparison-list">{rows.map(({ card, answers }) => <article key={card.id}>
    <img
      src={card.image.file}
      alt={card.image.alt}
      style={{ objectFit: card.image.fit ?? 'cover' }}

    />
    <div>
      <p>{card.question}</p><span>{conflictText(card, answers)}</span></div>
  </article>)}</div>;
}
