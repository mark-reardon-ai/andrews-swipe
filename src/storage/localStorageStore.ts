import { cleanAnswers } from '../actions';
import type { AppPerson, SwipeAnswersFile } from '../types';
import { filePerson, parseFile, safeStorage, type AnswerStore } from './index';
export class LocalStorageStore implements AnswerStore {
  private round?: string;
  private test: boolean;
  constructor(round?: string, test = false) { this.round = round; this.test = test; }
  private key(id: string, person: AppPerson) { return `31andrews.swipe.${this.test || person === 'mark' ? 'TEST.' : ''}${this.round ? `${this.round}.` : ''}${id}.${person}`; }
  async load(id: string, person: AppPerson) { const file = parseFile(safeStorage.get(this.key(id, person)), id, person); return file && !!file.x_test === (this.test || person === 'mark') ? file : null; }
  async save(file: SwipeAnswersFile) {
    file = { ...file, answers: cleanAnswers(file.answers) }; file = { ...file, x_test: this.test || file.person === 'mark' }; safeStorage.set(this.key(file.deck_id, filePerson(file)), JSON.stringify(file)); }
  async listPeople(id: string) { const people: AppPerson[] = this.test ? ['tom', 'jane', 'both', 'mark'] : ['tom', 'jane', 'both']; return (await Promise.all(people.map(async (p) => await this.load(id, p) ? p : null))).filter((p): p is AppPerson => p !== null); }
  async clear(id: string, person: AppPerson) { safeStorage.remove(this.key(id, person)); }
}
