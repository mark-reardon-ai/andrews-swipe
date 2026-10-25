// Verifies the app POSTs answer files to answers_endpoint (stubbed) and restores from it.
import { webkit, devices } from '@playwright/test'
import fs from 'fs'
const BASE = process.argv[2] || 'http://localhost:4173/'
let fails = 0; const check = (ok, m) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + m); if (!ok) fails++ }
const EP = 'https://script.google.com/macros/s/FAKE/exec'
const rounds = JSON.parse(fs.readFileSync('public/rounds.json', 'utf8')); rounds.answers_endpoint = EP
const posts = []; let stored = {}
const b = await webkit.launch(); const ctx = await b.newContext({ ...devices['iPhone 15'] })
await ctx.route('**/rounds.json*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(rounds) }))
await ctx.route(EP + '*', async r => {
  const req = r.request(); const h = { 'access-control-allow-origin': '*', 'content-type': 'application/json' }
  if (req.method() === 'POST') { const f = JSON.parse(req.postData()); posts.push(f); stored[`${f.deck_id}.${f.x_joint ? 'both' : f.person}.${!!f.test}`] = f; return r.fulfill({ headers: h, body: '{"ok":true}' }) }
  const u = new URL(req.url()); const f = stored[`${u.searchParams.get('deck_id')}.${u.searchParams.get('person')}.${u.searchParams.get('test') === '1'}`]
  return r.fulfill({ headers: h, body: JSON.stringify(f || {}) })
})
let p = await ctx.newPage()
await p.goto(BASE + '?who=jane'); await p.waitForTimeout(800)
for (let i = 0; i < 12; i++) { await p.keyboard.press(i % 3 ? 'ArrowLeft' : 'ArrowRight'); await p.waitForTimeout(500); const k = p.getByRole('button', { name: /keep going/i }); if (await k.isVisible().catch(() => false)) await k.click() }
await p.waitForTimeout(1500)
const last = posts.at(-1)
check(posts.length >= 1, `POSTs sent (${posts.length})`)
check(last?.person === 'jane' && last?.round_complete === true && last?.total_cards === 12 && last?.answers.length === 12, 'final POST has round_complete, total_cards, 12 answers')
check(Object.keys(last?.loved_questions || {}).length === 4, 'loved_questions included')
await p.screenshot({ path: 'screenshots/iphone-15_12-complete-synced.png' })
// New device (fresh storage) restores Jane from the endpoint
const ctx2 = await b.newContext({ ...devices['iPhone 15'] })
await ctx2.route('**/rounds.json*', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(rounds) }))
await ctx2.route(EP + '*', async r => { const u = new URL(r.request().url()); const f = stored[`${u.searchParams.get('deck_id')}.${u.searchParams.get('person')}.${u.searchParams.get('test') === '1'}`]; return r.fulfill({ headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' }, body: JSON.stringify(r.request().method() === 'POST' ? { ok: true } : (f || {})) }) })
p = await ctx2.newPage(); await p.goto(BASE); await p.waitForTimeout(1500)
check(/jane[\s\S]{0,40}(all done|12 of 12)/i.test(await p.locator('body').innerText()), 'fresh phone shows Jane restored from Sheet')
await b.close(); console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL PASS'); process.exit(fails ? 1 : 0)
