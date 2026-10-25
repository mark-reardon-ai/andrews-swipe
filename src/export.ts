import type { AppPerson, Deck, SwipeAnswer, SwipeAnswersFile, Sitting } from './types'
export function buildAnswersFile(deck: Deck, person: AppPerson, answers: SwipeAnswer[], previous?: SwipeAnswersFile | null, sessions?: Sitting[]): SwipeAnswersFile {
  const now = new Date().toISOString()
  const complete = deck.cards.every(c => answers.some(a => a.card_id === c.id))
  return { format: '31andrews.swipe_answers/1', deck_id: deck.deck_id, deck_version: deck.version, person: person === 'both' ? 'other' : person,
    ...(person === 'both' ? { x_joint: true, x_people: ['tom', 'jane'] as ('tom'|'jane')[] } : {}), x_round: deck.round,
    session: { started: previous?.session?.started ?? now, ...(complete ? { finished: now } : {}), device: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent, app_version: '0.1.0' }, answers, ...(previous?.x_removed ? { x_removed: previous.x_removed } : {}), x_sessions: sessions ?? previous?.x_sessions ?? [] }
}
export async function exportAnswers(file: SwipeAnswersFile): Promise<void> {
  const name = `${file.deck_id}.${file.x_joint ? 'both' : file.person}.json`
  const blob = new File([JSON.stringify(file, null, 2)], name, { type: 'application/json' })
  if (navigator.share && navigator.canShare?.({ files: [blob] })) {
    try { await navigator.share({ files: [blob] }); return } catch (e) { if ((e as Error).name === 'AbortError') return }
  }
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000)
}
