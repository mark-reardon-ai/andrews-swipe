// Scripted iPhone checks in Playwright WebKit (closest to iOS Safari on Linux).
// Usage: node tests/e2e.mjs [baseUrl] [outDir]   (default http://localhost:4173/)
import { webkit, devices } from '@playwright/test'
import fs from 'fs'
const BASE = process.argv[2] || 'http://localhost:4173/'
const OUT = process.argv[3] || 'screenshots'
fs.mkdirSync(OUT, { recursive: true })
const PHONES = ['iPhone SE', 'iPhone 15', 'iPhone 15 Pro Max']
let failures = 0
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++ }
const ls = (page) => page.evaluate(() => Object.fromEntries(Object.keys(localStorage).filter(k => k.startsWith('31andrews.swipe.')).map(k => [k, JSON.parse(localStorage.getItem(k))])))
const answersOf = async (page, who) => { const all = await ls(page); const k = Object.keys(all).find(k => k.endsWith('.' + who)); return k ? all[k].answers : [] }
const cardId = (page) => page.locator('[data-testid="swipe-card"]:not([aria-hidden])').first().getAttribute('data-card-id')

async function drag(page, dx, dy, { hold = false, shot } = {}) {
  const card = page.locator('[data-testid="swipe-card"]:not([aria-hidden])').first()
  const box = await card.boundingBox()
  const x = box.x + box.width / 2, y = box.y + box.height / 2
  await page.mouse.move(x, y); await page.mouse.down()
  const steps = 12
  for (let i = 1; i <= steps; i++) { await page.mouse.move(x + dx * i / steps, y + dy * i / steps); await page.waitForTimeout(16) }
  if (shot) await page.screenshot({ path: shot })
  if (!hold) { await page.mouse.up(); await page.waitForTimeout(700) }
}

for (const name of PHONES) {
  const slug = name.toLowerCase().replace(/\s+/g, '-')
  const browser = await webkit.launch(); const ctx = await browser.newContext({ ...devices[name] })
  const page = await ctx.newPage()
  const errors = []; page.on('pageerror', e => { if (!/access control checks/.test(e.message)) errors.push(e.message); else console.log('INFO  (ignored WebKit aborted-fetch notice on navigation)') })
  await page.goto(BASE); await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${slug}_1-start.png` })
  check(await page.getByRole('button', { name: /jane/i }).first().isVisible(), `${name}: start screen shows Jane button`)

  await page.getByRole('button', { name: /jane/i }).first().click(); await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${slug}_2-card.png` })
  const vw = devices[name].viewport.width
  const c1 = await cardId(page)
  await drag(page, vw * 0.28, 10, { hold: true, shot: `${OUT}/${slug}_3-mid-swipe.png` })
  await page.mouse.move(devices[name].viewport.width / 2 + vw * 0.55, devices[name].viewport.height / 2, { steps: 4 }); await page.mouse.up(); await page.waitForTimeout(700)
  let a = await answersOf(page, 'jane')
  check(a.some(x => x.card_id === c1 && x.swipe === 'yes'), `${name}: right swipe on ${c1} = yes`)
  const c2 = await cardId(page); check(c2 && c2 !== c1, `${name}: next card shown (${c2})`)
  await drag(page, -vw * 0.6, 0)
  a = await answersOf(page, 'jane'); check(a.some(x => x.card_id === c2 && x.swipe === 'no'), `${name}: left swipe on ${c2} = no`)
  const c3 = await cardId(page)
  await drag(page, 0, -devices[name].viewport.height * 0.45)
  a = await answersOf(page, 'jane'); check(a.some(x => x.card_id === c3 && x.swipe === 'skip'), `${name}: up swipe on ${c3} = skip`)
  // small drag springs back without answering
  const c4 = await cardId(page); const before = (await answersOf(page, 'jane')).length
  await drag(page, 25, 5)
  check((await answersOf(page, 'jane')).length === before && (await cardId(page)) === c4, `${name}: small drag springs back`)
  // undo
  await page.getByRole('button', { name: /back|undo/i }).first().click(); await page.waitForTimeout(600)
  check((await cardId(page)) === c3 && (await answersOf(page, 'jane')).length === before - 1, `${name}: undo returns to ${c3}`)
  // buttons for the rest, alternating
  const pattern = [/love it/i, /^no$|^no\b(?! ?thanks)/i, /not sure/i]
  for (let i = 0; i < 30; i++) {
    const keep = page.getByRole('button', { name: /keep going/i })
    if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(400) }
    if (!(await page.locator('[data-testid="swipe-card"]:not([aria-hidden])').count())) break
    const id = await cardId(page)
    await page.getByRole('button', { name: pattern[i % 3] }).last().click(); await page.waitForTimeout(650)
    if (i === 0) { a = await answersOf(page, 'jane'); check(a.some(x => x.card_id === id && x.swipe === 'yes'), `${name}: Love-it button on ${id} = yes`) }
  }
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${slug}_4-complete-jane.png`, fullPage: false })
  a = await answersOf(page, 'jane'); check(a.length === 12, `${name}: Jane answered all 12 (got ${a.length})`)
  // persistence across reload
  await page.reload(); await page.waitForTimeout(800)
  check((await answersOf(page, 'jane')).length === 12, `${name}: answers survive reload`)
  // Tom via per-person link, answer everything No (to create conflicts)
  await page.goto(BASE + '?who=tom'); await page.waitForTimeout(800)
  for (let i = 0; i < 30; i++) {
    const keep = page.getByRole('button', { name: /keep going/i })
    if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(400) }
    if (!(await page.locator('[data-testid="swipe-card"]:not([aria-hidden])').count())) break
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(600)
  }
  check((await answersOf(page, 'tom')).length === 12, `${name}: ?who=tom + keyboard answered 12`)
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${slug}_5-complete-tom-conflicts.png` })
  await page.screenshot({ path: `${OUT}/${slug}_5b-complete-tom-full.png`, fullPage: true })
  check(await page.getByText(/talk about/i).first().isVisible().catch(() => false), `${name}: "talk about" section visible`)
  await page.goto(BASE + '#/admin'); await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/${slug}_6-admin.png` })
  const adminH = await page.evaluate(() => document.documentElement.scrollHeight)
  console.log(`INFO  ${name}: admin page height ${adminH}px`)
  if (adminH * devices[name].deviceScaleFactor < 32000) await page.screenshot({ path: `${OUT}/${slug}_6b-admin-full.png`, fullPage: true })
  // layout sanity: no horizontal overflow
  await page.goto(BASE + '?who=both'); await page.waitForTimeout(800)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)
  check(!overflow, `${name}: no horizontal overflow`)
  await page.screenshot({ path: `${OUT}/${slug}_7-together-card.png` })
  check(errors.length === 0, `${name}: no page errors ${errors.slice(0, 3).join(' | ')}`)
  await ctx.close(); await browser.close()
}
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS')
process.exit(failures ? 1 : 0)
