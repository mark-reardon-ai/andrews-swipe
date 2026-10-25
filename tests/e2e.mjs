// Scripted iPhone checks in Playwright WebKit (closest to iOS Safari on Linux).
// Usage: node tests/e2e.mjs [baseUrl] [outDir]   (default http://localhost:4173/)
import { webkit, devices } from '@playwright/test'
import fs from 'fs'
const BASE = process.argv[2] || 'http://localhost:4173/'
const OUT = process.argv[3] || 'screenshots'
fs.mkdirSync(OUT, { recursive: true })
// Playwright viewports are Safari's visible area (toolbars shown): SE 1st gen 320x568, SE 3rd gen 375x667, 15 393x659, 15 Pro Max 430x739.
const PHONES = ['iPhone SE', 'iPhone SE (3rd gen)', 'iPhone 15', 'iPhone 15 Pro Max']
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
  const slug = name.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '-')
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
  await page.screenshot({ path: `${OUT}/${slug}_2a-ab-card-first.png` })
  await drag(page, -vw * 0.6, 0)
  a = await answersOf(page, 'jane'); check(a.some(x => x.card_id === c2 && x.swipe === 'no'), `${name}: left swipe on ${c2} = no`)
  // card 2 is an A/B pick: left = top image (swipe "no", x_pick "a")
  a = await answersOf(page, 'jane'); check(a.find(x => x.card_id === c2)?.x_pick === 'a', `${name}: A/B left swipe stores x_pick a`)
  const c3 = await cardId(page)
  // vertical drag does nothing (no "not sure")
  await drag(page, 0, -devices[name].viewport.height * 0.45)
  check((await cardId(page)) === c3 && (await answersOf(page, 'jane')).length === 2, `${name}: up swipe on ${c3} springs back, no answer`)
  // small drag springs back without answering
  await drag(page, 25, 5)
  check((await answersOf(page, 'jane')).length === 2 && (await cardId(page)) === c3, `${name}: small drag springs back`)
  await drag(page, vw * 0.6, 0)
  const before = (await answersOf(page, 'jane')).length
  await page.getByTestId('btn-undo').click(); await page.waitForTimeout(600)
  check((await cardId(page)) === c3 && (await answersOf(page, 'jane')).length === before - 1, `${name}: undo returns to ${c3}`)
  // only two answer actions on screen; no extra options
  const bodyText = await page.locator('body').innerText()
  check(!/not sure|add a note|your note|\bmore\b/i.test(bodyText), `${name}: no Not sure / note / More on card screen`)
  check(await page.getByTestId('btn-left').isVisible() && await page.getByTestId('btn-right').isVisible(), `${name}: left and right buttons visible`)
  const cb = await page.locator('[data-testid="swipe-card"]:not([aria-hidden])').first().boundingBox()
  const frac = cb.height / devices[name].viewport.height
  console.log(`INFO  ${name}: card image area ${(frac * 100).toFixed(0)}% of visible height`)
  check(frac >= 0.6, `${name}: image dominates (>= 60% of height)`)
  // buttons for the rest, alternating right/left
  let shotAB = false
  for (let i = 0; i < 30; i++) {
    const keep = page.getByRole('button', { name: /keep going/i })
    if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(400) }
    if (!(await page.locator('[data-testid="swipe-card"]:not([aria-hidden])').count())) break
    const id = await cardId(page)
    if (!shotAB && /Photo/.test(await page.getByTestId('btn-right').innerText())) { await page.screenshot({ path: `${OUT}/${slug}_2b-ab-card.png` }); shotAB = true }
    await page.getByTestId(i % 2 ? 'btn-left' : 'btn-right').click(); await page.waitForTimeout(650)
    if (i === 0) { a = await answersOf(page, 'jane'); check(a.some(x => x.card_id === id && x.swipe === 'yes'), `${name}: right button on ${id} = yes`) }
  }
  a = await answersOf(page, 'jane')
  check(a.every(x => ['yes', 'no'].includes(x.swipe) && x.note === undefined && x.strength === undefined), `${name}: answers are only yes/no, no notes/strength`)
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${slug}_4-complete-jane.png`, fullPage: false })
  a = await answersOf(page, 'jane'); check(a.length === 10, `${name}: Jane answered all 10 (got ${a.length})`)
  // persistence across reload
  await page.reload(); await page.waitForTimeout(800)
  check((await answersOf(page, 'jane')).length === 10, `${name}: answers survive reload`)
  // Tom via per-person link, answer everything No (to create conflicts)
  await page.goto(BASE + '?who=tom'); await page.waitForTimeout(800)
  for (let i = 0; i < 30; i++) {
    const keep = page.getByRole('button', { name: /keep going/i })
    if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(400) }
    if (!(await page.locator('[data-testid="swipe-card"]:not([aria-hidden])').count())) break
    await page.keyboard.press('ArrowLeft'); await page.waitForTimeout(600)
  }
  check((await answersOf(page, 'tom')).length === 10, `${name}: ?who=tom + keyboard answered 10`)
  await page.waitForTimeout(800)
  await page.screenshot({ path: `${OUT}/${slug}_5-complete-tom-conflicts.png` })
  await page.screenshot({ path: `${OUT}/${slug}_5b-complete-tom-full.png`, fullPage: true })
  check(await page.getByText(/talk about/i).first().isVisible().catch(() => false), `${name}: "talk about" section visible`)
  await page.goto(BASE + '?key=cape1941#/admin'); await page.waitForTimeout(1200)
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
