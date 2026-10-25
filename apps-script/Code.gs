// Bind this script to the destination Google Sheet. Configure Script Properties as documented.
function sheet_(name, columns) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  if (!sheet.getLastRow()) sheet.appendRow(columns);
  return sheet;
}
function json_(value) { return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON); }
function person_(f) { return f.x_joint ? 'both' : f.person; }
function doPost(e) {
  var lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    var f = JSON.parse(e.postData.contents);
    if (f.action === 'reset_test') return resetTest_(f.key);
    if (f.format !== '31andrews.swipe_answers/1' || !f.deck_id || !Array.isArray(f.answers)) throw new Error('Invalid answer file');
    var person = person_(f);
    var test = isTest_(f);
    f.x_test = test;
    var files = sheet_(test ? 'files_test' : 'files', ['deck_id','person','json']);
    var allFiles = files.getDataRange().getValues(); var fileRow = 0;
    for (var i=1;i<allFiles.length;i++) if (allFiles[i][0] === f.deck_id && allFiles[i][1] === person) { fileRow = i+1; break; }
    if (fileRow) {
      var old = JSON.parse(allFiles[fileRow-1][2]); var merged = {};
      (old.answers || []).concat(f.answers).forEach(function(a) { if (!merged[a.card_id] || a.at >= merged[a.card_id].at) merged[a.card_id] = a; });
      var removed = old.x_removed || {};
      Object.keys(f.x_removed || {}).forEach(function(k) { if (!removed[k] || f.x_removed[k] > removed[k]) removed[k] = f.x_removed[k]; });
      f.x_removed = removed;
      Object.keys(merged).forEach(function(k) { if (removed[k] && removed[k] >= merged[k].at) delete merged[k]; });
      f.answers = Object.keys(merged).map(function(k) { return merged[k]; });
      if (old.session && f.session && old.session.started < f.session.started) f.session.started = old.session.started;
      var sessions = {}; (old.x_sessions || []).concat(f.x_sessions || []).forEach(function(s) { sessions[s.started] = s; }); f.x_sessions = Object.keys(sessions).map(function(k) { return sessions[k]; });
    }
    var answers = sheet_(test ? 'answers_test' : 'answers', ['received_at','deck_id','deck_version','round','person','joint','card_id','swipe','strength','note','at','dwell_ms','revisited','app_version','device']);
    // Remove undone rows, bottom first so row indices stay stable.
    var existing = answers.getDataRange().getValues();
    for (var r=existing.length-1;r>=1;r--) if (existing[r][1] === f.deck_id && existing[r][4] === person && f.x_removed && f.x_removed[existing[r][6]] && f.x_removed[existing[r][6]] >= existing[r][10]) answers.deleteRow(r+1);
    var rows = answers.getDataRange().getValues(); var lookup = {};
    for (var j=1;j<rows.length;j++) lookup[JSON.stringify([rows[j][1],rows[j][4],rows[j][6]])] = j+1;
    f.answers.forEach(function(a) {
      var row = [new Date().toISOString(),f.deck_id,f.deck_version || '',f.x_round || '',person,!!f.x_joint,a.card_id,a.swipe,a.strength || '',a.note || '',a.at,a.dwell_ms == null ? '' : a.dwell_ms,!!a.revisited,(f.session || {}).app_version || '',(f.session || {}).device || ''];
      // Plain text format prevents user notes being interpreted as sheet formulas.
      var n = lookup[JSON.stringify([f.deck_id,person,a.card_id])] || answers.getLastRow()+1;
      answers.getRange(n,1,1,row.length).setNumberFormat('@').setValues([row]);
    });
    files.getRange(fileRow || files.getLastRow()+1,1,1,3).setNumberFormat('@').setValues([[f.deck_id,person,JSON.stringify(f)]]);
    notifyFinished_(f);
    return json_({ok:true});
  } catch (err) { return json_({ok:false,error:String(err)}); } finally { lock.releaseLock(); }
}
function doGet(e) {
  var test = e.parameter.test === '1' || e.parameter.person === 'mark';
  var sheet = sheet_(test ? 'files_test' : 'files', ['deck_id','person','json']); var rows = sheet.getDataRange().getValues();
  for (var i=1;i<rows.length;i++) if (rows[i][0] === e.parameter.deck_id && rows[i][1] === e.parameter.person) return ContentService.createTextOutput(rows[i][2]).setMimeType(ContentService.MimeType.JSON);
  return json_({});
}

// Pure helpers: also exercised directly by Vitest without Apps Script services.
function isTest_(file) { return file.test === true || file.x_test === true || file.person === 'mark'; }
function shouldNotify_(file, alreadyNotified) {
  return !alreadyNotified && file.round_complete === true && Number.isInteger(file.total_cards) && file.total_cards > 0 && file.answers.length >= file.total_cards;
}
function notificationKey_(file) { return JSON.stringify([file.deck_id, person_(file), isTest_(file)]); }
function resetTest_(key) {
  var expected = PropertiesService.getScriptProperties().getProperty('ADMIN_KEY');
  if (!expected || key !== expected) throw new Error('Ask Mark for help');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  ['answers_test', 'files_test'].forEach(function(name) {
    var sheet = ss.getSheetByName(name);
    if (sheet && sheet.getLastRow() > 1) sheet.deleteRows(2, sheet.getLastRow() - 1);
  });
  var notified = ss.getSheetByName('notified');
  if (notified) {
    var rows = notified.getDataRange().getValues();
    for (var i = rows.length - 1; i >= 1; i--) if (String(rows[i][2]) === 'true') notified.deleteRow(i + 1);
  }
  return json_({ok:true});
}
function notifyFinished_(file) {
  var notified = sheet_('notified', ['deck_id', 'person', 'test', 'sent_at']);
  var rows = notified.getDataRange().getValues();
  var person = person_(file);
  var test = isTest_(file);
  var already = rows.slice(1).some(function(row) { return row[0] === file.deck_id && row[1] === person && String(row[2]) === String(test); });
  if (!shouldNotify_(file, already)) return;
  var email = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL');
  if (!email) return;
  var name = person === 'both' ? 'Tom & Jane' : person.charAt(0).toUpperCase() + person.slice(1);
  var round = file.round || file.x_round || '';
  var roundName = /^R[0-9]+$/.test(round) ? 'Round ' + Number(round.slice(1)) : round;
  var counts = {yes:0, no:0, skip:0};
  file.answers.forEach(function(answer) { if (Object.prototype.hasOwnProperty.call(counts, answer.swipe)) counts[answer.swipe]++; });
  var loved = file.answers.filter(function(answer) { return answer.swipe === 'yes'; }).map(function(answer) {
    return answer.card_id + ((file.loved_questions || {})[answer.card_id] ? ': ' + file.loved_questions[answer.card_id] : '');
  });
  var notes = file.answers.filter(function(answer) { return answer.note; }).map(function(answer) { return answer.card_id + ': ' + answer.note; });
  var body = ['Person: ' + name, 'Round: ' + roundName + ' (' + round + ')', 'Deck: ' + file.deck_id,
    'Answered: ' + file.answers.length + ' / ' + file.total_cards,
    'Love it: ' + counts.yes + ' | No: ' + counts.no + ' | Not sure: ' + counts.skip,
    '', 'Loved cards:', loved.join('\n') || 'None', '', 'Notes:', notes.join('\n') || 'None', '', SpreadsheetApp.getActive().getUrl()].join('\n');
  MailApp.sendEmail({to:email, subject:(test ? '[TEST] ' : '') + name + ' finished ' + roundName + ' (' + round + ')', body:body});
  notified.getRange(notified.getLastRow() + 1, 1, 1, 4).setNumberFormat('@').setValues([[file.deck_id, person, String(test), new Date().toISOString()]]);
}
