import { beforeEach, describe, expect, it, vi } from 'vitest';
import script from '../../apps-script/Code.gs?raw';
import sample from '../../public/decks/R01-sample/deck.json';
import type { Deck } from '../types';
import { buildAnswersFile, exportFilename } from '../export';
import { safeStorage } from '../storage';
import { LocalStorageStore } from '../storage/localStorageStore';
import { clearRealLocal, clearTestLocal, isTestMode, resetTest } from '../testMode';
const deck = sample as unknown as Deck;
beforeEach(() => {
  for (const key of safeStorage.keys()) safeStorage.remove(key);
  vi.unstubAllGlobals();
});
describe('test isolation', () => {
  it.each(['tom', 'jane', 'both'] as const)('separates %s keys and resets only test progress', async person => {
    const real = new LocalStorageStore(deck.round);
    const test = new LocalStorageStore(deck.round, true);
    const file = buildAnswersFile(deck, person, []);
    await real.save(file);
    expect(await test.load(deck.deck_id, person)).toBeNull();
    await test.save({ ...file, x_test: true });
    expect(safeStorage.keys()).toContain(`31andrews.swipe.TEST.${deck.round}.${deck.deck_id}.${person}`);
    safeStorage.set('31andrews.outbox.TEST.endpoint', '{}');
    safeStorage.set('31andrews.outbox.endpoint', '{"keep":true}');
    clearTestLocal();
    expect(await test.load(deck.deck_id, person)).toBeNull();
    expect(await real.load(deck.deck_id, person)).toEqual(file);
    expect(safeStorage.get('31andrews.outbox.endpoint')).toBe('{"keep":true}');
    expect(safeStorage.get('31andrews.outbox.TEST.endpoint')).toBeNull();
  });
  it('always treats Mark as test, even without test=1', async () => {
    expect(isTestMode(new URLSearchParams('who=mark&test=0'))).toBe(true);
    expect(isTestMode(new URLSearchParams('who=tom'))).toBe(false);
    const file = buildAnswersFile(deck, 'mark', []);
    expect(file.x_test).toBe(true);
    const store = new LocalStorageStore(deck.round);
    await store.save(file);
    expect(await store.load(deck.deck_id, 'mark')).toEqual(file);
    expect(safeStorage.keys().every(k => k.includes('.TEST.'))).toBe(true);
    expect(exportFilename(file)).toBe(`${deck.deck_id}.mark.TEST.json`);
    expect(exportFilename(buildAnswersFile(deck, 'both', [], null, [], true))).toBe(`${deck.deck_id}.both.TEST.json`);
    expect(exportFilename(buildAnswersFile(deck, 'jane', []))).toBe(`${deck.deck_id}.jane.json`);
  });
  it('real reset is scoped by person and keeps test progress', async () => {
    for (const p of ['tom', 'jane', 'both'] as const) {
      await new LocalStorageStore(deck.round).save(buildAnswersFile(deck, p, []));
      await new LocalStorageStore(deck.round, true).save(buildAnswersFile(deck, p, [], null, [], true));
    }
    clearRealLocal('tom');
    expect(await new LocalStorageStore(deck.round).load(deck.deck_id, 'tom')).toBeNull();
    expect(await new LocalStorageStore(deck.round).load(deck.deck_id, 'jane')).not.toBeNull();
    clearRealLocal();
    expect(safeStorage.keys().every(k => k.includes('.TEST.'))).toBe(true);
  });
  it('posts an explicit keyed test reset and reports Sheet failures', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
    vi.stubGlobal('fetch', fetcher);
    expect(await resetTest('https://example.invalid', 'key')).toContain('and in the Sheet');
    expect(JSON.parse(fetcher.mock.calls[0][1].body)).toEqual({ action: 'reset_test', key: 'key' });
    fetcher.mockResolvedValue({ ok: true, json: async () => ({ ok: false }) });
    await expect(resetTest('https://example.invalid', 'bad')).rejects.toThrow('Sheet could not be cleared');
  });
});

// Execute the actual .gs helpers; no Apps Script services are needed for these decisions.
const logic = new Function(`${script}\nreturn {isTest_, shouldNotify_, notificationKey_};`)();
it('routes Mark and test flags and gates notifications on completion and totals', () => {
  expect(logic.isTest_({ person: 'mark' })).toBe(true);
  expect(logic.isTest_({ person: 'jane', test: true })).toBe(true);
  expect(logic.isTest_({ person: 'jane' })).toBe(false);
  const f = { deck_id: 'deck', person: 'jane', answers: [{}, {}], total_cards: 2, round_complete: true };
  expect(logic.shouldNotify_(f, false)).toBe(true);
  expect(logic.shouldNotify_(f, true)).toBe(false);
  expect(logic.shouldNotify_({ ...f, total_cards: 3 }, false)).toBe(false);
  expect(logic.shouldNotify_({ ...f, round_complete: false }, false)).toBe(false);
  expect(logic.shouldNotify_({ ...f, total_cards: 0 }, false)).toBe(false);
  expect(logic.notificationKey_(f)).not.toBe(logic.notificationKey_({ ...f, test: true }));
});

it('queues completion metadata durably and sends the final file after an in-flight save', async () => {
  const { AppsScriptStore } = await import('../storage/appsScriptStore');
  vi.stubGlobal('window', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('document', { addEventListener: vi.fn(), removeEventListener: vi.fn() });
  let finishFirst!: (response: unknown) => void;
  const fetcher = vi.fn().mockImplementationOnce(() => new Promise(resolve => { finishFirst = resolve; }))
    .mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });
  vi.stubGlobal('fetch', fetcher);
  const store = new AppsScriptStore('https://example.invalid', true, deck);
  try {
    await store.save(buildAnswersFile(deck, 'jane', [], null, [], true));
    const complete = buildAnswersFile(deck, 'jane', deck.cards.map(c => ({ card_id: c.id, swipe: 'yes', at: new Date().toISOString() })), null, [], true);
    await store.save(complete);
    const queued = JSON.parse(safeStorage.get('31andrews.outbox.TEST.https://example.invalid')!)[`${deck.deck_id}.jane`];
    expect(queued).toMatchObject({ test: true, x_test: true, round: deck.round, total_cards: deck.cards.length, round_complete: true });
    expect(queued.loved_questions[deck.cards[0].id]).toBe(deck.cards[0].question.slice(0, 240));
    finishFirst({ ok: true, json: async () => ({ ok: true }) });
    await vi.waitFor(() => expect(fetcher).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetcher.mock.calls[1][1].body).round_complete).toBe(true);
    await vi.waitFor(() => expect(safeStorage.get('31andrews.outbox.TEST.https://example.invalid')).toBe('{}'));
  } finally { store.dispose(); }
});

it('sends one completion email and a keyed reset clears only test rows and notifications', () => {
  class Sheet {
    rows: unknown[][];
    constructor(headers: string[]) { this.rows = [headers]; }
    getLastRow() { return this.rows.length; }
    getDataRange() { return { getValues: () => this.rows.map(row => [...row]) }; }
    appendRow(row: unknown[]) { this.rows.push(row); }
    deleteRow(row: number) { this.rows.splice(row - 1, 1); }
    deleteRows(row: number, count: number) { this.rows.splice(row - 1, count); }
    getRange(row: number) { return { setNumberFormat: () => ({ setValues: (values: unknown[][]) => { this.rows[row - 1] = values[0]; } }) }; }
  }
  const sheets = new Map<string, Sheet>();
  const ss = { getSheetByName: (name: string) => sheets.get(name), insertSheet: (name: string) => {
    const sheet = new Sheet([]); sheet.rows = []; sheets.set(name, sheet); return sheet;
  }, getUrl: () => 'https://sheet.invalid' };
  const mail = vi.fn();
  const helpers = new Function('SpreadsheetApp', 'PropertiesService', 'MailApp', 'ContentService', `${script}\nreturn {notifyFinished_, resetTest_};`)(
    { getActiveSpreadsheet: () => ss, getActive: () => ss },
    { getScriptProperties: () => ({ getProperty: (name: string) => name === 'ADMIN_KEY' ? 'admin' : 'notify@example.invalid' }) },
    { sendEmail: mail },
    { createTextOutput: (text: string) => ({ setMimeType: () => JSON.parse(text) }), MimeType: { JSON: 'json' } },
  );
  const f = { deck_id: 'deck', person: 'mark', answers: [{ card_id: 'card', swipe: 'yes', note: 'My note' }], total_cards: 1, round_complete: true, round: 'R01', loved_questions: { card: 'A question?' } };
  helpers.notifyFinished_(f); helpers.notifyFinished_(f);
  expect(mail).toHaveBeenCalledTimes(1);
  expect(mail.mock.calls[0][0]).toMatchObject({ subject: '[TEST] Mark finished Round 1 (R01)' });
  expect(mail.mock.calls[0][0].body).toContain('A question?');
  expect(mail.mock.calls[0][0].body).toContain('My note');
  helpers.notifyFinished_({ ...f, person: 'jane' });
  expect(mail.mock.calls[1][0].subject).toBe('Jane finished Round 1 (R01)');
  for (const name of ['answers', 'files', 'answers_test', 'files_test']) {
    const sheet = new Sheet(['header']); sheet.appendRow(['data']); sheets.set(name, sheet);
  }
  expect(() => helpers.resetTest_('wrong')).toThrow('Ask Mark');
  expect(sheets.get('files_test')?.getLastRow()).toBe(2);
  helpers.resetTest_('admin');
  expect(sheets.get('answers_test')?.getLastRow()).toBe(1);
  expect(sheets.get('files_test')?.getLastRow()).toBe(1);
  expect(sheets.get('answers')?.getLastRow()).toBe(2);
  expect(sheets.get('files')?.getLastRow()).toBe(2);
  expect(sheets.get('notified')?.rows[1][1]).toBe('jane');
  helpers.notifyFinished_(f);
  expect(mail).toHaveBeenCalledTimes(3);
});
