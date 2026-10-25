// Sessions + "next round" checks with network stubs (WebKit, iPhone 15).
// Usage: node tests/e2e-rounds.mjs [baseUrl] [outDir]
import { webkit, devices } from '@playwright/test'
import fs from 'fs'
const BASE = process.argv[2] || 'http://localhost:4173/'
const OUT = process.argv[3] || 'screenshots'
fs.mkdirSync(OUT, { recursive: true })
let failures = 0
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++ }
const top = '[data-testid="swipe-card"]:not([aria-hidden])'
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15'] })
const page = await ctx.newPage()
const realRounds = JSON.parse(fs.readFileSync('public/rounds.json', 'utf8'))
const realDeck = JSON.parse(fs.readFileSync('public/decks/R01-sample/deck.json', 'utf8'))
let current = 'R01'
await page.route('**/rounds.json*', route => {
  const r = structuredClone(realRounds)
  r.rounds[0].session_size = 5
  r.rounds.push({ round: 'R02', deck: 'decks/R01-sample/deck-r02.json', title: 'Round 2: Test round', session_size: 5, status: 'open', published: '2026-10-26T12:00:00Z' })
  r.current = current
  route.fulfill({ contentType: 'application/json', body: JSON.stringify(r) })
})
await page.route('**/deck-r02.json*', route => {
  const d = structuredClone(realDeck); d.deck_id = 'DECK-R02-TEST-v1'; d.round = 'R02'; d.cards = d.cards.slice(0, 3).map((c, i) => ({ ...c, id: `SC-R02-00${i + 1}` }))
  route.fulfill({ contentType: 'application/json', body: JSON.stringify(d) })
})
await page.goto(BASE + '?who=jane'); await page.waitForTimeout(800)
const progress = async () => (await page.locator('body').innerText()).match(/(\d+)\s+of\s+(\d+)/)?.slice(1).join('/')
check((await progress()) === '1/5', `progress shows 1 of 5 (got ${await progress()})`)
for (let i = 0; i < 5; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(550) }
const keep = page.getByRole('button', { name: /keep going/i })
check(await keep.isVisible(), 'break screen after 5 cards')
await page.screenshot({ path: `${OUT}/iphone-15_8-session-break.png` })
await page.reload(); await page.waitForTimeout(800)
const resumed = (await page.locator(top).count()) ? await page.locator(top).getAttribute('data-card-id') : null
check(resumed === 'SC-R01-006' || await keep.isVisible().catch(() => false), `reload resumes at card 6 (got ${resumed})`)
if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(400) }
check((await progress()) === '1/5', `second session progress restarts at 1 of 5 (got ${await progress()})`)
for (let i = 0; i < 20; i++) {
  if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(400) }
  if (!(await page.locator(top).count())) break
  await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(550)
}
await page.waitForTimeout(500)
check(/next round|coming soon|putting together/i.test(await page.locator('body').innerText()), 'all-done / next round coming screen')
current = 'R02'
await page.evaluate(() => { document.dispatchEvent(new Event('visibilitychange')); window.dispatchEvent(new Event('focus')) })
await page.waitForTimeout(1500)
const newBtn = page.getByRole('button', { name: /new round|next round|let's go|start/i }).first()
check(await newBtn.isVisible().catch(() => false), 'new round button appears after rounds.json changes')
await page.screenshot({ path: `${OUT}/iphone-15_9-new-round-ready.png` })
if (await newBtn.isVisible().catch(() => false)) await newBtn.click()
await page.waitForTimeout(1000)
if (!(await page.locator(top).count())) { const jane = page.getByRole('button', { name: /jane/i }).first(); if (await jane.isVisible().catch(() => false)) { await jane.click(); await page.waitForTimeout(800) } }
check((await page.locator(top).getAttribute('data-card-id').catch(() => null)) === 'SC-R02-001', 'R02 first card shown')
const keys = await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('31andrews.swipe.')))
check(keys.some(k => k.includes('R01')) , `R01 answers kept (${keys.join(', ')})`)
await browser.close()
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS')
process.exit(failures ? 1 : 0)
