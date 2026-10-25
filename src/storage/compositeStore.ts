import type { AppPerson, SwipeAnswersFile } from '../types'
import type { AnswerStore } from './index'
export function mergeFiles(a: SwipeAnswersFile | null, b: SwipeAnswersFile | null): SwipeAnswersFile | null {
  if (!a) return b; if (!b) return a
  const answers = new Map(b.answers.map(x => [x.card_id, x]))
  for (const answer of a.answers) if (!answers.has(answer.card_id) || answer.at >= answers.get(answer.card_id)!.at) answers.set(answer.card_id, answer)
  const removed = { ...b.x_removed }
  for (const [id, at] of Object.entries(a.x_removed ?? {})) if (!removed[id] || at > removed[id]) removed[id] = at
  for (const [id, answer] of answers) if (removed[id] && removed[id] >= answer.at) answers.delete(id)
  const sessions = new Map([...(b.x_sessions ?? []), ...(a.x_sessions ?? [])].map(s => [s.started, s]))
  const starts = [a.session?.started,b.session?.started].filter((s): s is string => !!s).sort()
  return { ...b, ...a, session: { ...b.session, ...a.session, ...(starts.length ? { started: starts[0] } : {}) }, answers: [...answers.values()], x_removed: removed, x_sessions: [...sessions.values()] }
}
// A future GoogleSheetStore or HTTP store implements AnswerStore and plugs in here.
// Local writes finish first; remote writes must queue and retry without blocking UI.
export class CompositeStore implements AnswerStore {
  private local: AnswerStore; private remote?: AnswerStore
  constructor(local: AnswerStore, remote?: AnswerStore) { this.local = local; this.remote = remote }
  async load(id: string, person: AppPerson) { const [a,b] = await Promise.all([this.local.load(id,person),this.remote?.load(id,person) ?? null]); const file = mergeFiles(a,b); if (file) await this.local.save(file); return file }
  async save(file: SwipeAnswersFile) { await this.local.save(file); void this.remote?.save(file).catch(() => {}) }
  listPeople(id: string) { return this.local.listPeople(id) }
  async clear(id: string, p: AppPerson) { await this.local.clear(id,p); await this.remote?.clear(id,p) }
}
