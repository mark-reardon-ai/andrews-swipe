import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const options = {};
for (let i = 0; i < args.length; i += 1) {
    const name = args[i];
    if (name === '--make-current') options[name] = true;
    else if (['--round', '--deck', '--img', '--session-size', '--title'].includes(name) && args[i + 1] && !args[i + 1].startsWith('--')) options[name] = args[++i];
    else throw new Error(`Unknown or incomplete option: ${name}`);
}
const round = options['--round'];
const source = options['--deck'];
if (!/^R[0-9]+$/.test(round ?? '') || !source) throw new Error('Usage: node scripts/publish-round.mjs --round R02 --deck path/to/deck.json [--img path/to/img] [--session-size 20] [--title "..."] [--make-current]');
const size = Number(options['--session-size'] ?? 20);
if (!Number.isInteger(size) || size < 1) throw new Error('Session size must be a positive integer.');
const deckPath = path.resolve(source);
const deck = JSON.parse(await fs.readFile(deckPath, 'utf8'));
const ajv = new Ajv2020({ strict: false });
addFormats(ajv);
ajv.addSchema(JSON.parse(await fs.readFile(path.join(root, 'schema/common.schema.json'), 'utf8')));
const validate = ajv.compile(JSON.parse(await fs.readFile(path.join(root, 'schema/swipe_card.schema.json'), 'utf8')));
function checkDeck() {
    if (!validate(deck)) throw new Error(`Invalid deck: ${ajv.errorsText(validate.errors)}`);
    const ids = deck.cards.map(card => card.id);
    if (new Set(ids).size !== ids.length) throw new Error('Card IDs must be unique.');
}
checkDeck();
deck.round = round;
deck.session_size = size;
const target = path.join(root, 'public/decks', round);
const stage = await fs.mkdtemp(path.join(root, 'public/decks', `.publish-${round}-`));
const imageRoot = options['--img'] ? path.resolve(options['--img']) : path.dirname(deckPath);
function relativeFile(file) {
    if (typeof file !== 'string' || path.isAbsolute(file) || file.split(/[\\/]/).includes('..') || /^[a-z]+:/i.test(file)) throw new Error(`Images must have safe relative paths: ${file}`);
    return file;
}
async function imageSource(file) {
    const candidates = options['--img'] ? [path.join(imageRoot, file.replace(/^img\//, '')), path.join(imageRoot, file)] : [path.join(imageRoot, file)];
    for (const candidate of candidates) {
        try { await fs.access(candidate); return candidate; } catch { /* Try the next image root. */ }
    }
    throw new Error(`Missing image: ${file}`);
}
const cwebp = spawnSync('cwebp', ['-version'], { stdio: 'ignore' }).status === 0;
const pillow = !cwebp && spawnSync('python3', ['-c', 'from PIL import Image; assert Image.registered_extensions().get(".webp") == "WEBP"'], { stdio: 'ignore' }).status === 0;
if (!cwebp && !pillow) console.warn('No cwebp or Python Pillow WebP converter available. Skipping new variants; original images will work.');
try {
    const copied = new Set();
    const variants = new Map();
    async function copyImage(file) {
        relativeFile(file);
        const destination = path.join(stage, file);
        if (!copied.has(file)) {
            await fs.mkdir(path.dirname(destination), { recursive: true });
            await fs.copyFile(await imageSource(file), destination);
            copied.add(file);
        }
        return destination;
    }
    for (const card of deck.cards) {
        for (const [field, extension] of [['file', 'x_webp'], ['file_b', 'x_webp_b']]) {
            const file = card.image[field];
            if (!file) continue;
            const original = await copyImage(file);
            const existing = card.image[extension] ?? {};
            const available = {};
            for (const [width, variant] of Object.entries(existing)) {
                try { await copyImage(variant); available[width] = variant; }
                catch { console.warn(`Skipping unavailable variant ${variant}`); }
            }
            if (!variants.has(file)) {
                const generated = {};
                if (cwebp || pillow) {
                    for (const width of [720, 1280]) {
                        const variant = `${file.replace(/\.[^.]+$/, '')}-${width}.webp`;
                        const destination = path.join(stage, variant);
                        const result = cwebp
                            ? spawnSync('cwebp', ['-quiet', '-q', '82', '-resize', String(width), '0', original, '-o', destination])
                            : spawnSync('python3', ['-c', 'from PIL import Image, ImageOps; import sys; im=ImageOps.exif_transpose(Image.open(sys.argv[1])).convert("RGB"); w=int(sys.argv[3]); im.resize((w,max(1,round(im.height*w/im.width)))).save(sys.argv[2],"WEBP",quality=82)', original, destination, String(width)]);
                        if (result.status === 0) generated[width] = variant;
                        else console.warn(`Could not convert ${file} at ${width}px; keeping the original.`);
                    }
                }
                variants.set(file, generated);
            }
            const sources = { ...available, ...variants.get(file) };
            if (Object.keys(sources).length) card.image[extension] = sources;
            else delete card.image[extension];
        }
    }
    checkDeck();
    await fs.writeFile(path.join(stage, 'deck.json'), JSON.stringify(deck, null, 2) + '\n');
    const manifestPath = path.join(root, 'public/rounds.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const previous = manifest.rounds.find(entry => entry.round === round);
    const entry = { round, deck: `decks/${round}/deck.json`, title: options['--title'] ?? previous?.title ?? `Round ${round.slice(1)}`, session_size: size, status: 'open', published: new Date().toISOString() };
    manifest.rounds = [...manifest.rounds.filter(entry => entry.round !== round), entry];
    if (options['--make-current']) manifest.current = round;
    // Preserve unrelated files when republishing an existing round.
    await fs.mkdir(target, { recursive: true });
    await fs.cp(stage, target, { recursive: true });
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(`Published ${round}: ${deck.cards.length} cards to ${target}${options['--make-current'] ? ' (current)' : ''}`);
} finally {
    await fs.rm(stage, { recursive: true, force: true });
}
