// Runs apps-script/Code.gs against in-memory fakes of the Apps Script services.
// Usage: node tests/apps-script-mock.mjs
import fs from 'fs'; import vm from 'vm'
const sheets = {}; const mail = []; const props = { ADMIN_KEY: 'cape1941', NOTIFY_EMAIL: 'mark@example.com' }
function makeSheet(name) {
  const rows = []
  const s = { rows,
    getLastRow: () => rows.length,
    appendRow: r => rows.push(r.map(String)),
    getDataRange: () => ({ getValues: () => rows.map(r => [...r]) }),
    getRange: (row, col, nr, nc) => { const rg = { setNumberFormat: () => rg, setValues: v => { while (rows.length < row) rows.push([]); rows[row - 1] = v[0].map(String) } }; return rg },
    deleteRow: i => rows.splice(i - 1, 1), deleteRows: (i, n) => rows.splice(i - 1, n) }
  return s
}
const ss = { getSheetByName: n => sheets[n] || null, insertSheet: n => (sheets[n] = makeSheet(n)), getUrl: () => 'https://docs.google.com/spreadsheets/d/FAKE' }
const out = t => ({ setMimeType: () => t, text: t })
const ctx = vm.createContext({ JSON, Object, Number, String, Date, Error, Array,
  SpreadsheetApp: { getActiveSpreadsheet: () => ss, getActive: () => ss },
  ContentService: { createTextOutput: t => ({ setMimeType: () => t }), MimeType: { JSON: 'json' } },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  PropertiesService: { getScriptProperties: () => ({ getProperty: k => props[k] }) },
  MailApp: { sendEmail: m => mail.push(m) } })
vm.runInContext(fs.readFileSync('apps-script/Code.gs', 'utf8'), ctx)
const post = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }))
const get = p => JSON.parse(ctx.doGet({ parameter: p }))
let fails = 0; const check = (ok, m) => { console.log((ok ? 'PASS  ' : 'FAIL  ') + m); if (!ok) fails++ }
const ans = (n, swipe = 'yes') => Array.from({ length: n }, (_, i) => ({ card_id: `SC-R01-00${i + 1}`, swipe, at: `2026-10-25T16:0${i}:00Z`, dwell_ms: 1000 }))
const file = (person, n, extra = {}) => ({ format: '31andrews.swipe_answers/1', deck_id: 'DECK-R01-SAMPLE-v1', deck_version: 1, person, x_round: 'R01', round: 'R01', answers: ans(n), total_cards: 3, round_complete: n >= 3, loved_questions: { 'SC-R01-001': 'Wall out?' }, ...extra })
check(post(file('jane', 2)).ok, 'Jane partial post ok')
check(sheets.answers.rows.length === 3 && mail.length === 0, 'Jane rows in answers, no email yet')
post(file('jane', 3)); check(mail.length === 1 && /^Jane finished Round 1/.test(mail[0].subject), `Jane finish email: "${mail[0]?.subject}"`)
check(sheets.answers.rows.length === 4, 'Jane rows upserted (3 + header)')
post(file('jane', 3)); check(mail.length === 1, 'no duplicate email')
post(file('mark', 3, { x_test: true, test: true })); check(mail.length === 2 && mail[1].subject.startsWith('[TEST] Mark finished'), `Mark test email: "${mail[1]?.subject}"`)
check(sheets.answers_test.rows.length === 4 && sheets.answers.rows.length === 4, 'Mark rows only in answers_test')
post(file('other', 3, { x_joint: true, x_people: ['tom', 'jane'] })); check(mail[2]?.subject.startsWith('Tom & Jane finished'), `joint email: "${mail[2]?.subject}"`)
check(get({ deck_id: 'DECK-R01-SAMPLE-v1', person: 'jane' }).answers?.length === 3, 'doGet returns Jane file')
check(get({ deck_id: 'DECK-R01-SAMPLE-v1', person: 'mark', test: '1' }).answers?.length === 3, 'doGet test returns Mark file')
check(post({ action: 'reset_test', key: 'wrong' }).ok === false && sheets.answers_test.rows.length === 4, 'reset with wrong key refused')
check(post({ action: 'reset_test', key: 'cape1941' }).ok, 'reset with key ok')
check(sheets.answers_test.rows.length === 1 && sheets.files_test.rows.length === 1, 'test tabs cleared')
check(sheets.answers.rows.length === 7 && sheets.files.rows.length === 3, 'real tabs untouched (Jane + joint)')
post(file('mark', 3, { x_test: true, test: true })); check(mail.length === 4, 'test email can be re-sent after reset')
// undo tombstone removes row
post(file('jane', 3, { x_removed: { 'SC-R01-003': '2026-10-25T17:00:00Z' } }))
check(!sheets.answers.rows.some(r => r[4] === 'jane' && r[6] === 'SC-R01-003'), 'undo tombstone removes Jane card 3 row')
// formula-injection guard: note stored as text
post(file('tom', 1, { answers: [{ card_id: 'SC-R01-001', swipe: 'yes', at: '2026-10-25T18:00:00Z', note: '=IMPORTXML("x")' }] }))
check(sheets.answers.rows.some(r => r[9] === '=IMPORTXML("x")'), 'note stored (cells set to plain-text format in real Sheets)')
console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL PASS'); process.exit(fails ? 1 : 0)
