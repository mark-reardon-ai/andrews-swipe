import { safeStorage } from './storage';
import type { AppPerson } from './types';
export const isTestMode = (params: URLSearchParams) => params.get('test') === '1' || params.get('who') === 'mark';
export function clearTestLocal() {
  for (const key of safeStorage.keys())
    if (key.startsWith('31andrews.swipe.TEST.') || key.startsWith('31andrews.outbox.TEST.') || key.startsWith('31andrews.TEST.')) safeStorage.remove(key);
}
export function clearRealLocal(person?: AppPerson) {
  for (const key of safeStorage.keys()) {
    if (key.startsWith('31andrews.swipe.') && !key.startsWith('31andrews.swipe.TEST.') && (person ? key.endsWith(`.${person}`) : /\.(tom|jane|both)$/.test(key))) safeStorage.remove(key);
    if (key.startsWith('31andrews.outbox.') && !key.startsWith('31andrews.outbox.TEST.')) {
      try {
        const queue = JSON.parse(safeStorage.get(key) ?? '{}');
        for (const id of Object.keys(queue)) if (person ? id.endsWith(`.${person}`) : /\.(tom|jane|both)$/.test(id)) delete queue[id];
        safeStorage.set(key, JSON.stringify(queue));
      } catch { /* Preserve unrecognized queues. */ }
    }
  }
}
export async function resetTest(endpoint: string | undefined, key: string) {
  clearTestLocal();
  if (!endpoint) return 'Test data cleared on this phone';
  try {
    const response = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'reset_test', key }), signal: AbortSignal.timeout(15000) });
    if (!response.ok || (await response.json()).ok !== true) throw new Error('Test data cleared on this phone. The Sheet could not be cleared; check the admin key and try again.');
    return 'Test data cleared on this phone and in the Sheet';
  } catch {
    throw new Error('Test data cleared on this phone. The Sheet could not be cleared; check the connection and admin key, then try again.');
  }
}
