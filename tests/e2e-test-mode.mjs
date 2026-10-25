// Test-mode isolation + reset checks (WebKit, iPhone 15).
import { webkit, devices } from '@playwright/test'
import fs from 'fs'
const BASE = process.argv[2] || 'http://localhost:4173/'
const OUT = process.argv[3] || 'screenshots'
fs.mkdirSync(OUT, { recursive: true })
let failures = 0
const check = (ok, msg) => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${msg}`); if (!ok) failures++ }
const top = '[data-testid="swipe-card"]:not([aria-hidden])'
const keys = (page) => page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('31andrews.swipe.')))
const browser = await webkit.launch()
const ctx = await browser.newContext({ ...devices['iPhone 15'] })
const page = await ctx.newPage()
// Real Tom answers 3 cards
await page.goto(BASE + '?who=tom'); await page.waitForTimeout(800)
for (let i = 0; i < 3; i++) { await page.keyboard.press('ArrowRight'); await page.waitForTimeout(550) }
const realTom = await page.evaluate(() => { const k = Object.keys(localStorage).find(k => /\.tom$/.test(k) && !k.includes('TEST')); return k && localStorage.getItem(k) })
check(!!realTom, 'real Tom progress saved')
// Mark test run, all cards
await page.goto(BASE + '?who=mark'); await page.waitForTimeout(800)
check(/test run/i.test(await page.locator('body').innerText()), 'test banner shown for ?who=mark')
await page.screenshot({ path: `${OUT}/iphone-15_10-test-run-mark.png` })
for (let i = 0; i < 30; i++) {
  const keep = page.getByRole('button', { name: /keep going/i })
  if (await keep.isVisible().catch(() => false)) { await keep.click(); await page.waitForTimeout(400) }
  if (!(await page.locator(top).count())) break
  await page.keyboard.press(i % 2 ? 'ArrowLeft' : 'ArrowRight'); await page.waitForTimeout(550)
}
let k = await keys(page)
check(k.some(x => x.includes('TEST') && x.endsWith('.mark')), `Mark answers stored under TEST namespace (${k.join(', ')})`)
// Test as Jane
await page.goto(BASE + '?test=1&who=jane'); await page.waitForTimeout(800)
await page.keyboard.press('ArrowRight'); await page.waitForTimeout(600)
k = await keys(page)
check(k.some(x => x.includes('TEST') && x.endsWith('.jane')) && !k.some(x => !x.includes('TEST') && x.endsWith('.jane')), 'test Jane isolated from real Jane')
// Real Tom resumes at card 4, unchanged
await page.goto(BASE + '?who=tom'); await page.waitForTimeout(800)
check((await page.locator(top).getAttribute('data-card-id')) === 'SC-R01-004', 'real Tom resumes at card 4 after test runs')
// Reset without key does nothing
await page.goto(BASE + '?reset=1'); await page.waitForTimeout(800)
check((await keys(page)).some(x => x.includes('TEST')), 'reset without key leaves data')
// Reset with key
await page.goto(BASE + '?reset=1&key=cape1941'); await page.waitForTimeout(1200)
await page.screenshot({ path: `${OUT}/iphone-15_11-reset-done.png` })
k = await keys(page)
check(!k.some(x => x.includes('TEST')), `test data cleared (${k.join(', ')})`)
const realTomAfter = await page.evaluate(() => { const k = Object.keys(localStorage).find(k => /\.tom$/.test(k) && !k.includes('TEST')); return k && localStorage.getItem(k) })
check(realTomAfter === realTom, 'real Tom data untouched by reset')
await browser.close()
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL PASS')
process.exit(failures ? 1 : 0)
