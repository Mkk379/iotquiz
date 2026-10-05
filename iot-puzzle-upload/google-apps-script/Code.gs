// Paste this into Extensions > Apps Script of your Google Sheet, then
// Deploy > New deployment > Web app (Execute as: Me, Who has access: Anyone).

const SHEET_NAME = 'Scores';
const HEADERS = ['Timestamp', 'Unit', 'Name', 'Score', 'Time', 'Date'];
const LIMIT = 15;

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  try {
    const unit = Number(e.parameter.unit);
    const rows = getSheet_().getDataRange().getValues().slice(1);
    const scores = rows
      .filter(r => Number(r[1]) === unit)
      .map(r => ({ name: String(r[2]), score: Number(r[3]), time: Number(r[4]), date: String(r[5]) }))
      .sort((a, b) => b.score - a.score || a.time - b.time)
      .slice(0, LIMIT);
    return json_({ scores });
  } catch (err) {
    return json_({ error: String(err) });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const d = JSON.parse(e.postData.contents);
    const unit = Number(d.unit);
    const score = Number(d.score);
    const time = Number(d.time);
    const name = String(d.name || 'Anonymous').slice(0, 40);
    if (!(unit >= 1 && unit <= 5) || !isFinite(score) || !isFinite(time)) {
      return json_({ error: 'Invalid entry' });
    }
    getSheet_().appendRow([new Date(), unit, name, score, time, String(d.date || '')]);
    return json_({ ok: true });
  } catch (err) {
    return json_({ error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
