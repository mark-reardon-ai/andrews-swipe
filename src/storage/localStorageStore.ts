import type { AppPerson, SwipeAnswersFile } from '../types'
import { filePerson, parseFile, safeStorage, type AnswerStore } from './index'
export class LocalStorageStore implements AnswerStore {
  private round?: string
  constructor(round?: string) { this.round = round }
  private key(id: string, person: AppPerson) { return `31andrews.swipe.${this.round ? `${this.round}.` : ''}${id}.${person}` }
  async load(id: string, person: AppPerson) { return parseFile(safeStorage.get(this.key(id, person)), id, person) }
  async save(file: SwipeAnswersFile) { safeStorage.set(this.key(file.deck_id, filePerson(file)), JSON.stringify(file)) }
  async listPeople(id: string) { const people: AppPerson[] = ['tom','jane','both']; return (await Promise.all(people.map(async p => await this.load(id, p) ? p : null))).filter((p): p is AppPerson => p !== null) }
  async clear(id: string, person: AppPerson) { safeStorage.remove(this.key(id, person)) }
}
