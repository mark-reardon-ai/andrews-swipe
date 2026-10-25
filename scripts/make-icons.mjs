// Optional helper, never part of the build. No extra dependencies needed.
// Later: use your preferred SVG-to-PNG tool to produce 180/192/512px PNGs,
// then update apple-touch-icon and manifest icons for broader iOS support.
import { readFile, writeFile } from 'node:fs/promises'
const icon = await readFile(new URL('../public/icon.svg', import.meta.url), 'utf8')
await writeFile(new URL('../public/apple-touch-icon.svg', import.meta.url), icon)
console.log('Copied the Cape icon. PNG conversion can be added later.')
