import type { Deck, Rounds } from './types'
export const defaultDeckUrl = `${import.meta.env.BASE_URL}decks/R01-sample/deck.json`
export const roundsUrl = `${import.meta.env.BASE_URL}rounds.json`
export async function loadRounds(): Promise<Rounds> {
  const response = await fetch(roundsUrl, { cache: 'no-store' })
  if (!response.ok) throw new Error('We couldn’t find the rounds. Please try again in a moment.')
  const data = await response.json()
  if (data.format !== '31andrews.swipe_rounds/1' || !Array.isArray(data.rounds) || !data.rounds.some((r: { round: string }) => r.round === data.current)) throw new Error('This round isn’t quite ready. Please ask Mark to check it.')
  return data
}
export async function loadDeck(url: string): Promise<Deck> {
  const absolute = new URL(url, document.baseURI)
  const response = await fetch(absolute)
  if (!response.ok) throw new Error('The pictures couldn’t load. Please try again when you’re connected.')
  const d = await response.json()
  if (d.format !== '31andrews.swipe_deck/1' || typeof d.deck_id !== 'string' || typeof d.round !== 'string' || !Number.isInteger(d.version) || d.version < 1 || typeof d.created !== 'string' || !['concept', 'photoreal_textures', 'photoreal_products'].includes(d.realism) || !Array.isArray(d.cards) || !d.cards.length) throw new Error('These pictures aren’t quite ready. Please ask Mark to check the deck.')
  const ids = new Set<string>()
  for (const c of d.cards) {
    if (!c.id || ids.has(c.id) || !['anchor_now','option','compare','detail','picks_so_far'].includes(c.kind) || typeof c.question !== 'string' || !c.image || typeof c.image.file !== 'string' || typeof c.image.alt !== 'string' || typeof c.yes?.summary !== 'string' || typeof c.no?.summary !== 'string') throw new Error('One picture is missing its details. Please ask Mark to check it.')
    ids.add(c.id)
    c.image.file = new URL(c.image.file, absolute).href
    if (c.image.file_b) c.image.file_b = new URL(c.image.file_b, absolute).href
    if (c.image.x_webp) c.image.x_webp = Object.fromEntries(Object.entries(c.image.x_webp).filter(([w, p]) => /^\d+$/.test(w) && typeof p === 'string').map(([w, p]) => [w, new URL(p as string, absolute).href]))
  }
  d.cards.sort((a: {order?: number}, b: {order?: number}) => (a.order ?? Infinity) - (b.order ?? Infinity))
  return d
}
