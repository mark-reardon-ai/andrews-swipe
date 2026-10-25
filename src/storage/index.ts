import type { AppPerson, SwipeAnswersFile } from '../types'
export interface AnswerStore { load(deckId: string, person: AppPerson): Promise<SwipeAnswersFile | null>; save(file: SwipeAnswersFile): Promise<void>; listPeople(deckId: string): Promise<AppPerson[]>; clear(deckId: string, person: AppPerson): Promise<void> }
export const filePerson = (f: SwipeAnswersFile): AppPerson => f.x_joint ? 'both' : f.person === 'jane' ? 'jane' : 'tom'
const memory = new Map<string, string>()
export const safeStorage = {
  get(key: string): string | null { try { return memory.get(key) ?? localStorage.getItem(key) } catch { return memory.get(key) ?? null } },
  set(key: string, value: string) { memory.set(key, value); try { localStorage.setItem(key, value) } catch { /* Private browsing: retain this session in memory. */ } },
  remove(key: string) { memory.delete(key); try { localStorage.removeItem(key) } catch { /* Memory fallback. */ } },
}
export function parseFile(raw: string | null, deckId: string, person: AppPerson): SwipeAnswersFile | null {
  try { const f = JSON.parse(raw ?? 'null'); return f?.format === '31andrews.swipe_answers/1' && f.deck_id === deckId && filePerson(f) === person && Array.isArray(f.answers) && f.answers.every((a: {card_id?: string; swipe?: string; at?: string}) => typeof a.card_id === 'string' && ['yes','no','skip'].includes(a.swipe ?? '') && Number.isFinite(Date.parse(a.at ?? ''))) ? f : null } catch { return null }
}
