import type { Deck, Rounds } from './types';
export const defaultDeckUrl = `${import.meta.env.BASE_URL}decks/R01-sample/deck.json`;
export const roundsUrl = `${import.meta.env.BASE_URL}rounds.json`;
export async function loadRounds(): Promise<Rounds> {
    const response = await fetch(roundsUrl, { cache: 'no-store' });
    if (!response.ok)
        throw new Error('We couldn’t find the rounds. Please try again in a moment.');
    const data = await response.json();
    if (data.format !== '31andrews.swipe_rounds/1' || !Array.isArray(data.rounds) || !data.rounds.some((r: {
        round: string;
    }) => r.round === data.current))
        throw new Error('This round isn’t quite ready. Please ask Mark to check it.');
    return data;
}
export async function loadDeck(url: string): Promise<Deck> {
    const absolute = new URL(url, document.baseURI);
    const response = await fetch(absolute);
    if (!response.ok)
        throw new Error('The pictures couldn’t load. Please try again when you’re connected.');
    return prepareDeck(await response.json(), absolute.href);
}
export function prepareDeck(d: Deck, url: string): Deck {
    const absolute = new URL(url, document.baseURI);
    if (!d || d.format !== '31andrews.swipe_deck/1' || typeof d.deck_id !== 'string' || typeof d.round !== 'string' || !Number.isInteger(d.version) || d.version < 1 || typeof d.created !== 'string' || !Number.isFinite(Date.parse(d.created)) || !['concept', 'photoreal_textures', 'photoreal_products'].includes(d.realism) || !Array.isArray(d.cards) || !d.cards.length)
        throw new Error('These pictures aren’t quite ready. Please ask Mark to check the deck.');
    const ids = new Set<string>();
    for (const c of d.cards) {
        if (!c || typeof c.id !== 'string' || !c.id || ids.has(c.id) || !['anchor_now', 'option', 'compare', 'detail', 'picks_so_far'].includes(c.kind) || typeof c.question !== 'string' || !c.image || typeof c.image.file !== 'string' || typeof c.image.alt !== 'string' || typeof c.yes?.summary !== 'string' || typeof c.no?.summary !== 'string')
            throw new Error('One picture is missing its details. Please ask Mark to check it.');
        if (c.image.fit !== undefined && !['cover', 'contain'].includes(c.image.fit))
            throw new Error('One picture has an unsupported image fit. Please use cover or contain.');
        if (c.image.file_b !== undefined && typeof c.image.file_b !== 'string')
            throw new Error('One comparison picture has an invalid second image path.');
        if ((c.detail !== undefined && typeof c.detail !== 'string') || (c.option_tags !== undefined && (!Array.isArray(c.option_tags) || !c.option_tags.every(tag => typeof tag === 'string'))))
            throw new Error('One picture has invalid text or tags. Please ask Mark to check it.');
        for (const implication of [c.yes, c.no]) {
            if (implication.eliminates !== undefined && (!Array.isArray(implication.eliminates) || !implication.eliminates.every(id => typeof id === 'string')))
                throw new Error('One picture has invalid eliminated options.');
            if (implication.sets !== undefined && (!Array.isArray(implication.sets) || !implication.sets.every(value => value && typeof value.decision === 'string')))
                throw new Error('One picture has invalid decision settings.');
        }
        ids.add(c.id);
        c.image.file = new URL(c.image.file, absolute).href;
        if (c.image.file_b)
            c.image.file_b = new URL(c.image.file_b, absolute).href;
        for (const key of ['x_webp', 'x_webp_b'] as const) {
            if (c.image[key])
                c.image[key] = Object.fromEntries(Object.entries(c.image[key]).filter(([w, p]) => /^\d+$/.test(w) && typeof p === 'string').map(([w, p]) => [w, new URL(p as string, absolute).href]));
        }
    }
    d.cards.sort((a: {
        order?: number;
    }, b: {
        order?: number;
    }) => (a.order ?? Infinity) - (b.order ?? Infinity));
    return d;
}
