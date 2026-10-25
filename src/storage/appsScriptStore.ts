import type { AppPerson, Deck, SwipeAnswersFile } from '../types';
import { filePerson, parseFile, safeStorage, type AnswerStore } from './index';
export class AppsScriptStore implements AnswerStore {
  private endpoint: string;
  private key: string;
  private sending = false;
  private disposed = false;
  private test: boolean;
  private deck?: Deck;
  constructor(endpoint: string, test = false, deck?: Deck) {
    this.test = test;
    this.deck = deck;
    this.endpoint = endpoint;
    this.key = `31andrews.outbox.${test ? 'TEST.' : ''}${endpoint}`;
    window.addEventListener('online', this.retry);
    window.addEventListener('focus', this.retry);
    document.addEventListener('visibilitychange', this.retry);
    void this.flush();
  }
  dispose() { this.disposed = true; window.removeEventListener('online', this.retry); window.removeEventListener('focus', this.retry); document.removeEventListener('visibilitychange', this.retry); }
  private retry = () => { void this.flush(); };
  private queue(): Record<string, SwipeAnswersFile> {
    try {
      return JSON.parse(safeStorage.get(this.key) ?? '{}');
    }
    catch {
      return {};
    }
  }
  async save(file: SwipeAnswersFile) {
    const payload = {
      ...file, x_test: this.test || file.person === 'mark', test: this.test || file.person === 'mark', round: file.x_round,
      total_cards: this.deck?.cards.length,
      round_complete: !!this.deck && this.deck.cards.every(c => file.answers.some(a => a.card_id === c.id)),
      loved_questions: Object.fromEntries((this.deck?.cards ?? []).filter(c => file.answers.some(a => a.card_id === c.id && a.swipe === 'yes')).map(c => [c.id, c.question.slice(0, 240)])),
    };
    const q = this.queue();
    q[`${file.deck_id}.${filePerson(file)}`] = payload;
    safeStorage.set(this.key, JSON.stringify(q));
    void this.flush();
  }
  async flush() {
    if (this.sending || this.disposed)
      return;
    this.sending = true;
    let succeeded = false;
    try {
      for (const [id, file] of Object.entries(this.queue())) {
        const response = await fetch(this.endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(file), signal: AbortSignal.timeout(15000) });
        if (!response.ok || (await response.json()).ok !== true)
          return;
        const latest = this.queue();
        if (JSON.stringify(latest[id]) === JSON.stringify(file)) {
          delete latest[id];
          safeStorage.set(this.key, JSON.stringify(latest));
        }
      }
      succeeded = true;
    }
    catch { /* Durable outbox retries on next answer, online, focus or visibility. */ }
    finally {
      this.sending = false;
      // An answer may have arrived while a previous POST was in flight.
      if (succeeded && Object.keys(this.queue()).length) void this.flush();
    }
  }
  async load(id: string, person: AppPerson) {
    try {
      const url = new URL(this.endpoint);
      url.searchParams.set('deck_id', id);
      url.searchParams.set('person', person);
      if (this.test || person === 'mark') url.searchParams.set('test', '1');
      const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
      const file = r.ok ? parseFile(await r.text(), id, person) : null;
      return file && !!file.x_test === (this.test || person === 'mark') ? file : null;
    }
    catch {
      return null;
    }
  }
  async listPeople(id: string) { const people: AppPerson[] = this.test ? ['tom', 'jane', 'both', 'mark'] : ['tom', 'jane', 'both']; return (await Promise.all(people.map(async (p) => await this.load(id, p) ? p : null))).filter((p): p is AppPerson => p !== null); }
  async clear(id: string, person: AppPerson) { const q = this.queue(); delete q[`${id}.${person}`]; safeStorage.set(this.key, JSON.stringify(q)); }
}
