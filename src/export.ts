import type { AppPerson, Deck, SwipeAnswer, SwipeAnswersFile, Sitting } from './types';
export function buildAnswersFile(deck: Deck, person: AppPerson, answers: SwipeAnswer[], previous?: SwipeAnswersFile | null, sessions?: Sitting[]): SwipeAnswersFile {
    const now = new Date().toISOString();
    const complete = deck.cards.every(c => answers.some(a => a.card_id === c.id));
    return {
        format: '31andrews.swipe_answers/1',
        deck_id: deck.deck_id,
        deck_version: deck.version,
        person: person === 'both' ? 'other' : person,
        ...(person === 'both' ? { x_joint: true, x_people: ['tom', 'jane'] as ('tom' | 'jane')[] } : {}),
        x_round: deck.round,
        session: {
            started: previous?.session?.started ?? now,
            ...(complete ? { finished: now } : {}),
            device: typeof navigator === 'undefined' ? 'unknown' : navigator.userAgent,
            app_version: '0.1.0',
        },
        answers,
        favorites: previous?.favorites?.filter(id => answers.some(a => a.card_id === id && a.swipe === 'yes')) ?? [],
        ...(previous?.x_removed ? { x_removed: previous.x_removed } : {}),
        x_sessions: sessions ?? previous?.x_sessions ?? [],
    };
}
export async function shareFile(name: string, content: string, type = 'application/json'): Promise<void> {
    const file = new File([content], name, { type });
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
        try {
            await navigator.share({ files: [file] });
            return;
        }
        catch (error) {
            if ((error as Error).name === 'AbortError')
                return;
        }
    }
    const url = URL.createObjectURL(file);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportAnswers(file: SwipeAnswersFile) {
    return shareFile(`${file.deck_id}.${file.x_joint ? 'both' : file.person}.json`, JSON.stringify(file, null, 2));
}
export function answersCSV(files: SwipeAnswersFile[]): string {
    const rows: unknown[][] = [['question', 'person', 'value', 'strength', 'note', 'at', 'channel', 'recorded_by', 'joint']];
    for (const file of files) {
        for (const answer of file.answers) {
            rows.push([answer.card_id, file.person, answer.swipe, answer.strength ?? '', answer.note ?? '', answer.at, 'swipe_app', file.person, !!file.x_joint]);
        }
    }
    return rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\r\n');
}
