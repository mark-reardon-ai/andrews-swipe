// Bind this script to the destination Google Sheet. No secrets required.
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
    if (f.format !== '31andrews.swipe_answers/1' || !f.deck_id || !Array.isArray(f.answers)) throw new Error('Invalid answer file');
    var person = person_(f);
    var files = sheet_('files', ['deck_id','person','json']);
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
    var answers = sheet_('answers', ['received_at','deck_id','deck_version','round','person','joint','card_id','swipe','strength','note','at','dwell_ms','revisited','app_version','device']);
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
    return json_({ok:true});
  } catch (err) { return json_({ok:false,error:String(err)}); } finally { lock.releaseLock(); }
}
function doGet(e) {
  var sheet = sheet_('files', ['deck_id','person','json']); var rows = sheet.getDataRange().getValues();
  for (var i=1;i<rows.length;i++) if (rows[i][0] === e.parameter.deck_id && rows[i][1] === e.parameter.person) return ContentService.createTextOutput(rows[i][2]).setMimeType(ContentService.MimeType.JSON);
  return json_({});
}
