import { useEffect, useState } from 'react';
import { loadDeck, loadRounds, prepareDeck } from '../deck';
import { sectionOf, type AppPerson, type Deck, type Rounds, type SwipeAnswersFile } from '../types';
import { filePerson, parseFile, safeStorage } from '../storage';
import { LocalStorageStore } from '../storage/localStorageStore';
import { mergeFiles } from '../storage/compositeStore';
import { answersCSV, exportAnswers, shareFile } from '../export';
import { compareAnswers, personName, answerLabel } from '../compare';
import ComparisonList from '../components/ComparisonList';
const people: AppPerson[] = ['tom', 'jane', 'both'];
export default function AdminScreen() {
    const [rounds, setRounds] = useState<Rounds>();
    const [deck, setDeck] = useState<Deck>();
    const [selected, setSelected] = useState('');
    const [files, setFiles] = useState<SwipeAnswersFile[]>([]);
    const [error, setError] = useState('');
    const [status, setStatus] = useState('');
    const [key, setKey] = useState('');
    const [unlocked, setUnlocked] = useState(false);
    const [url, setUrl] = useState('');
    const [busy, setBusy] = useState(false);
    // This is a casual lock, not security: the key and all data are browser accessible.
    const allowed = !!rounds && (!rounds.admin_key || unlocked);
    useEffect(() => {
        void loadRounds().then(manifest => {
            setRounds(manifest);
            setSelected(manifest.current);
            const supplied = new URLSearchParams(location.search).get('key') ?? safeStorage.get('31andrews.adminKey');
            if (manifest.admin_key && supplied === manifest.admin_key) {
                safeStorage.set('31andrews.adminKey', supplied);
                setUnlocked(true);
            }
        }).catch(e => setError(String(e.message)));
    }, []);
    async function installDeck(next: Deck) {
        const local = new LocalStorageStore(next.round);
        const loaded = await Promise.all(people.map(p => local.load(next.deck_id, p)));
        setDeck(next);
        setFiles(loaded.filter((f): f is SwipeAnswersFile => !!f));
    }
    useEffect(() => {
        if (!allowed || !rounds)
            return;
        const round = rounds.rounds.find(r => r.round === selected);
        if (!round)
            return;
        let cancelled = false;
        setBusy(true);
        setError('');
        const absolute = new URL(round.deck, new URL(import.meta.env.BASE_URL, document.baseURI)).href;
        void loadDeck(absolute).then(async (next) => {
            const local = new LocalStorageStore(next.round);
            const loaded = await Promise.all(people.map(p => local.load(next.deck_id, p)));
            if (!cancelled) {
                setDeck(next);
                setFiles(loaded.filter((f): f is SwipeAnswersFile => !!f));
            }
        }).catch(e => {
            if (!cancelled)
                setError(e.message);
        }).finally(() => {
            if (!cancelled)
                setBusy(false);
        });
        return () => { cancelled = true; };
    }, [allowed, selected, rounds]);
    function combine(incoming: SwipeAnswersFile[]) {
        setFiles(previous => {
            const byPerson = new Map(previous.map(f => [filePerson(f), f]));
            for (const file of incoming) {
                byPerson.set(filePerson(file), mergeFiles(file, byPerson.get(filePerson(file)) ?? null)!);
            }
            return [...byPerson.values()];
        });
    }
    async function importAnswers(input: FileList | null) {
        if (!input || !deck)
            return;
        const incoming: SwipeAnswersFile[] = [];
        const errors: string[] = [];
        for (const file of Array.from(input)) {
            try {
                const raw = await file.text();
                const candidate = JSON.parse(raw);
                if (!['tom', 'jane'].includes(candidate.person) && !(candidate.person === 'other' && candidate.x_joint === true))
                    throw new Error('Use a Tom, Jane, or joint answer file.');
                const parsed = parseFile(raw, deck.deck_id, filePerson(candidate));
                if (!parsed)
                    throw new Error('This answer file does not match this deck or has invalid answers.');
                incoming.push(parsed);
            }
            catch (e) {
                errors.push(`${file.name}: ${(e as Error).message}`);
            }
        }
        combine(incoming);
        setError(errors.join(' '));
        setStatus(`Imported ${incoming.length} answer files.`);
    }
    async function fetchSheet() {
        if (!deck || !rounds?.answers_endpoint)
            return;
        setBusy(true);
        setError('');
        const incoming: SwipeAnswersFile[] = [];
        const errors: string[] = [];
        await Promise.all(people.map(async (person) => {
            try {
                const endpoint = new URL(rounds.answers_endpoint!);
                endpoint.searchParams.set('deck_id', deck.deck_id);
                endpoint.searchParams.set('person', person);
                const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
                if (!response.ok)
                    throw new Error('Could not fetch answers.');
                const raw = await response.text();
                const payload = JSON.parse(raw);
                if (payload === null || (typeof payload === 'object' && !Array.isArray(payload) && Object.keys(payload).length === 0))
                    return;
                const parsed = parseFile(raw, deck.deck_id, person);
                if (!parsed)
                    throw new Error('The Sheet returned an invalid answer file.');
                incoming.push(parsed);
            }
            catch (e) {
                errors.push(`${personName(person)}: ${(e as Error).message}`);
            }
        }));
        combine(incoming);
        setError(errors.join(' '));
        setStatus(`Fetched ${incoming.length} answer files.`);
        setBusy(false);
    }
    async function copyLink(person?: AppPerson) {
        const link = new URL(location.origin + location.pathname);
        if (person)
            link.searchParams.set('who', person);
        else
            link.hash = '/admin';
        try {
            await navigator.clipboard.writeText(link.href);
            setStatus('Link copied.');
        }
        catch {
            setStatus(`Copy this link: ${link.href}`);
        }
    }
    const comparisons = deck ? compareAnswers(deck, files) : [];
    const conflicts = comparisons.filter(c => c.conflict);
    const tally = new Map<string, {
        yes: number;
        no: number;
        skip: number;
    }>();
    for (const row of comparisons) {
        for (const tag of new Set([`section:${sectionOf(row.card)}`, ...(row.card.option_tags ?? [])])) {
            const counts = tally.get(tag) ?? { yes: 0, no: 0, skip: 0 };
            for (const answer of row.answers)
                counts[answer.swipe] += 1;
            tally.set(tag, counts);
        }
    }
    return <main className="admin screen">
        <header>
            <h1>Mark’s workshop</h1>
            <a className="button" href="#/">Back to the kitchen</a>
        </header>
        {error && <p role="alert" className="error">{error}</p>}
        <p role="status">{status || (busy ? 'Loading…' : '')}</p>
        {!rounds && !error && <p>Loading rounds…</p>}
        {rounds && !allowed && <form onSubmit={e => {
            e.preventDefault();
            if (key === rounds.admin_key) {
                safeStorage.set('31andrews.adminKey', key);
                setUnlocked(true);
                setError('');
            }
            else
                setError('That key didn’t match. Please try again.');
        }}>
            <p>A casual lock for the workshop. This is not secure access control.</p>
            <label>Admin key<input type="password" value={key} onChange={e => setKey(e.target.value)} />
            </label>
            <button>Open workshop</button>
        </form>}
        {allowed && <>
            <section>
                <h2>Deck source</h2>
                <label>Round<select value={selected} disabled={busy} onChange={e => setSelected(e.target.value)}>{rounds!.rounds.map(r => <option key={r.round} value={r.round}>{r.title} ({r.round})</option>)}</select>
                </label>
                <label>Load a deck file<input type="file" accept=".json,application/json" disabled={busy} onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file)
                        return;
                    try {
                        await installDeck(prepareDeck(JSON.parse(await file.text()), new URL(`decks/${selected}/deck.json`, new URL(import.meta.env.BASE_URL, document.baseURI)).href));
                        setError('');
                        setStatus('Deck loaded. Image paths resolve under this round’s deck folder.');
                    }
                    catch {
                        setError('That deck could not load. Please check its format, cards, and image paths.');
                    }
                    e.target.value = '';
                }} />
                </label>
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    setBusy(true);
                    try {
                        const absolute = new URL(url, document.baseURI);
                        if (!['http:', 'https:'].includes(absolute.protocol))
                            throw new Error('Please use an http or https deck URL.');
                        await installDeck(await loadDeck(absolute.href));
                        setError('');
                    }
                    catch (e) {
                        setError((e as Error).message);
                    }
                    setBusy(false);
                }}>
                    <label>Deck URL<input type="url" value={url} onChange={e => setUrl(e.target.value)} required />
                    </label>
                    <button disabled={busy}>Load deck from URL</button>
                </form>
            </section>
            {deck && <>
                <h2>{deck.deck_id} · {deck.round}</h2>
                <section>
                    <h2>Answers</h2>
                    <label>Import answer files<input type="file" accept=".json,application/json" multiple onChange={e => { void importAnswers(e.target.files); e.target.value = ''; }} />
                    </label>
                    {rounds!.answers_endpoint && <button disabled={busy} onClick={() => void fetchSheet()}>Fetch from Sheet</button>}
                    <div className="progress-cards">{people.map(person => {
                        const file = files.find(f => filePerson(f) === person);
                        const answered = deck.cards.filter(c => file?.answers.some(a => a.card_id === c.id)).length;
                        const last = file?.answers.map(a => a.at).sort().at(-1);
                        return <article key={person}>
                            <h3>{personName(person)}</h3>
                            <p>{answered} / {deck.cards.length} answered</p>
                            <p>{file?.x_sessions?.length ?? (file?.session ? 1 : 0)} sessions</p>
                            <p>Last activity: {last ? new Date(last).toLocaleString() : 'Not started'}</p>{file && <button onClick={() => void exportAnswers(file)}>Export {personName(person)}</button>}</article>;
                    })}</div>
                </section>
                <section>
                    <h2>Per-card answers</h2>
                    <table className="answer-table">
                        <thead>
                            <tr>
                                <th>Card</th>
                                <th>People’s answers</th>
                                <th>Implications (admin only)</th>
                            </tr>
                        </thead>
                        <tbody>{comparisons.map(({ card, answers }) => <tr key={card.id}>
                            <td>
                                <img className="admin-thumb" src={card.image.file} alt={card.image.alt} style={{ objectFit: card.image.fit ?? 'cover' }} />
                                <p>{card.id} · {sectionOf(card)}</p>
                                <strong>{card.question}</strong>
                            </td>
                            <td>{answers.length ? answers.map(a => <div key={a.person}>
                                <span className={`chip ${a.swipe}`}>{personName(a.person)}: {answerLabel(a.swipe)}</span>
                                <p>Strength: {a.strength ?? '—'} · {a.dwell_ms === undefined ? '—' : (a.dwell_ms / 1000).toFixed(1)} seconds</p>
                                <p>Note: {a.note || '—'}</p>
                            </div>) : 'No answers yet'}</td>
                            <td>{(['yes', 'no'] as const).map(value => <div key={value}>
                                <strong>{value === 'yes' ? 'Yes' : 'No'}:</strong> {card[value].summary}{card[value].eliminates && <p>Eliminates: {card[value].eliminates.join(', ')}</p>}{card[value].sets && <p>Sets: {card[value].sets.map(s => `${s.decision} = ${JSON.stringify(s.value)}`).join(', ')}</p>}</div>)}</td>
                        </tr>)}</tbody>
                    </table>
                </section>
                <section>
                    <h2>Conflicts</h2>{!conflicts.length && <p>No differences yet.</p>}<ComparisonList rows={conflicts} />
                </section>
                <section>
                    <h2>Agreed yes</h2>
                    <ComparisonList rows={comparisons.filter(c => c.agreedYes)} />
                </section>
                <section>
                    <h2>Tally by section/option tag</h2>{[...tally].map(([tag, counts]) => <p key={tag}>
                        <strong>{tag}</strong>: {counts.yes} yes · {counts.no} no · {counts.skip} skip</p>)}</section>
                <section className="actions">
                    <h2>Export everything</h2>
                    <button onClick={() => void shareFile(`${deck.deck_id}.bundle.json`, JSON.stringify({ format: '31andrews.swipe_bundle/1', exported_at: new Date().toISOString(), deck_id: deck.deck_id, round: deck.round, files, conflicts: conflicts.map(({ card, answers }) => ({ card_id: card.id, answers })) }, null, 2))}>Export bundle JSON</button>
                    <button onClick={() => void shareFile(`${deck.deck_id}.csv`, answersCSV(files), 'text/csv;charset=utf-8')}>Export CSV</button>
                </section>
                <section>
                    <h2>Danger zone</h2>
                    <p>Clears answers and pending sends on this device. Imported and Sheet answers are not deleted.</p>{people.map(person => <button key={person} onClick={async () => {
                        if (!confirm(`Reset this device for ${personName(person)}? This cannot be undone.`))
                            return;
                        await new LocalStorageStore(deck.round).clear(deck.deck_id, person);
                        await new LocalStorageStore().clear(deck.deck_id, person);
                        if (rounds!.answers_endpoint) {
                            const outboxKey = `31andrews.outbox.${rounds!.answers_endpoint}`;
                            try {
                                const queue = JSON.parse(safeStorage.get(outboxKey) ?? '{}');
                                delete queue[`${deck.deck_id}.${person}`];
                                safeStorage.set(outboxKey, JSON.stringify(queue));
                            }
                            catch { /* Leave unrelated pending sends intact. */ }
                        }
                        setFiles(previous => previous.filter(f => filePerson(f) !== person));
                        setStatus(`Reset this device for ${personName(person)}.`);
                    }}>Reset this device for {personName(person)}</button>)}</section>
            </>}
            <section className="actions">
                <h2>Share links</h2>{people.map(person => <button key={person} onClick={() => void copyLink(person)}>Copy link for {personName(person)}</button>)}<button onClick={() => void copyLink()}>Copy admin link</button>
            </section>
        </>}
    </main>;
}
