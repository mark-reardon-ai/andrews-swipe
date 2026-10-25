import type { AppPerson, SwipeAnswersFile } from '../types';
export interface AnswerStore {
    load(deckId: string, person: AppPerson): Promise<SwipeAnswersFile | null>;
    save(file: SwipeAnswersFile): Promise<void>;
    listPeople(deckId: string): Promise<AppPerson[]>;
    clear(deckId: string, person: AppPerson): Promise<void>;
}
export const filePerson = (f: SwipeAnswersFile): AppPerson => f.x_joint ? 'both' : f.person === 'jane' ? 'jane' : 'tom';
const memory = new Map<string, string>();
export const safeStorage = {
    get(key: string): string | null {
        try {
            return memory.get(key) ?? localStorage.getItem(key);
        }
        catch {
            return memory.get(key) ?? null;
        }
    },
    set(key: string, value: string) {
        memory.set(key, value); try {
            localStorage.setItem(key, value);
        }
            catch { /* Private browsing: retain this session in memory. */ }
    },
    remove(key: string) {
        memory.delete(key); try {
            localStorage.removeItem(key);
        }
            catch { /* Memory fallback. */ }
    },
};
export function parseFile(raw: string | null, deckId: string, person: AppPerson): SwipeAnswersFile | null {
    try {
        const file = JSON.parse(raw ?? 'null');
        if (!file || file.format !== '31andrews.swipe_answers/1' || file.deck_id !== deckId)
            return null;
        const joint = file.person === 'other' && file.x_joint === true;
        if (!(joint || ['tom', 'jane'].includes(file.person)) || filePerson(file) !== person)
            return null;
        if (file.x_joint && !joint)
            return null;
        if (!Array.isArray(file.answers))
            return null;
        const ids = new Set<string>();
        for (const answer of file.answers) {
            if (!answer || typeof answer.card_id !== 'string' || ids.has(answer.card_id))
                return null;
            if (!['yes', 'no', 'skip'].includes(answer.swipe) || !Number.isFinite(Date.parse(answer.at)))
                return null;
            if (answer.strength !== undefined && ![1, 2, 3].includes(answer.strength))
                return null;
            if (answer.note !== undefined && typeof answer.note !== 'string')
                return null;
            if (answer.dwell_ms !== undefined && (!Number.isInteger(answer.dwell_ms) || answer.dwell_ms < 0))
                return null;
            ids.add(answer.card_id);
        }
        if (file.favorites !== undefined && (!Array.isArray(file.favorites) || !file.favorites.every((id: unknown) => typeof id === 'string')))
            return null;
        if (file.x_sessions !== undefined && (!Array.isArray(file.x_sessions) || !file.x_sessions.every((session: {
            started?: string;
            cards?: unknown[];
        }) => session && Number.isFinite(Date.parse(session.started ?? '')) && Array.isArray(session.cards))))
            return null;
        return file;
    }
    catch {
        return null;
    }
}
