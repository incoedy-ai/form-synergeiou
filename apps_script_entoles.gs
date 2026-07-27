/**
 * INCO — Αποθήκευση & Ανάγνωση Εντολών Εφαρμογής
 *  - doPost (JSON)  : σώζει εντολή (ΕΝΤΟΛΕΣ + ΕΝΤΟΛΕΣ_ΥΛΙΚΑ). Δημόσιο (η φόρμα).
 *  - doGet?action=orders&token=... : επιστρέφει τις ΝΕΕΣ εντολές ως JSON (για την Access).
 *  - doGet?action=mark&ids=..&token=.. : μαρκάρει εντολές ως ΣΥΓΧΡΟΝΙΣΜΕΝΗ.
 * Τα action=orders/mark προστατεύονται με API_TOKEN (δεν υπάρχει στη δημόσια φόρμα).
 */

var API_TOKEN = 'SET_YOUR_TOKEN_HERE';   // μυστικό — ΜΗΝ το ανεβάζεις στο public repo· το ξέρει μόνο το εργαλείο της Access

var HEADER_COLS = [
  'orderId','timestamp','kod','pelatis','diey','dieyEf','imer','ora','och',
  'kat','trop','xrew','fpaPct','katharo','fpaPoso','enanti','ypol','exof',
  'da','tda','tpy','apy','eaee','simSyn','signature','status'
];
var LINE_COLS = ['orderId','lineNo','typ','met','skevasma','kodSkevasma','pak','q1','q2'];

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';
  if (action === 'orders' || action === 'mark') {
    if (e.parameter.token !== API_TOKEN) return jsonOut_({ ok: false, error: 'unauthorized' });
    return action === 'orders' ? getOrders_(e) : markSynced_(e);
  }
  return ContentService
    .createTextOutput('INCO Entoles endpoint OK — ' + new Date())
    .setMimeType(ContentService.MimeType.TEXT);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var hSheet = ensureSheet_(ss, 'ΕΝΤΟΛΕΣ', HEADER_COLS);
    var lSheet = ensureSheet_(ss, 'ΕΝΤΟΛΕΣ_ΥΛΙΚΑ', LINE_COLS);

    var now = new Date();
    var orderId = data.orderId || makeOrderId_(now);

    var pay = data.payment || {};
    var doc = data.docs || {};
    hSheet.appendRow([
      orderId, now, data.kod||'', data.pelatis||'', data.diey||'', data.dieyEf||'',
      data.imer||'', data.ora||'', data.och||'',
      pay.kat||'', pay.trop||'', pay.xrew||'', pay.fpaPct||'', pay.katharo||'',
      pay.fpaPoso||'', pay.enanti||'', pay.ypol||'', pay.exof||'',
      doc.da||'', doc.tda||'', doc.tpy||'', doc.apy||'', '',
      data.simSyn||'', data.signature||'', 'ΝΕΑ'
    ]);

    var mats = data.materials || [];
    for (var i = 0; i < mats.length; i++) {
      var m = mats[i];
      lSheet.appendRow([
        orderId, i+1, m.typ||'', m.met||'', m.sel||'',
        extractKod_(m.sel), m.pak||'', m.q1||'', m.q2||''
      ]);
    }

    return jsonOut_({ ok: true, orderId: orderId, lines: mats.length });
  } catch (err) {
    return jsonOut_({ ok: false, error: String(err) });
  }
}

// Επιστρέφει τις εντολές με status='ΝΕΑ' (ή όλες με &all=1), με τα υλικά τους.
function getOrders_(e) {
  var onlyNew = (e.parameter.all !== '1');
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hSheet = ss.getSheetByName('ΕΝΤΟΛΕΣ');
  if (!hSheet) return jsonOut_({ ok: true, count: 0, orders: [] });

  var matMap = {};
  var lSheet = ss.getSheetByName('ΕΝΤΟΛΕΣ_ΥΛΙΚΑ');
  if (lSheet && lSheet.getLastRow() > 1) {
    var lVals = lSheet.getDataRange().getValues();
    var lHead = lVals.shift();
    lVals.forEach(function(r) {
      var o = rowToObj_(lHead, r);
      if (!matMap[o.orderId]) matMap[o.orderId] = [];
      matMap[o.orderId].push(o);
    });
  }

  var orders = [];
  if (hSheet.getLastRow() > 1) {
    var hVals = hSheet.getDataRange().getValues();
    var hHead = hVals.shift();
    hVals.forEach(function(r) {
      var o = rowToObj_(hHead, r);
      if (!o.orderId) return;
      if (onlyNew && o.status !== 'ΝΕΑ') return;
      o.materials = matMap[o.orderId] || [];
      orders.push(o);
    });
  }
  return jsonOut_({ ok: true, count: orders.length, orders: orders });
}

// Μαρκάρει τις δοσμένες orderId ως ΣΥΓΧΡΟΝΙΣΜΕΝΗ ώστε να μην ξαναδιαβαστούν.
function markSynced_(e) {
  var ids = String(e.parameter.ids || '').split(',').filter(String);
  if (!ids.length) return jsonOut_({ ok: false, error: 'no ids' });
  var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ΕΝΤΟΛΕΣ');
  var vals = sh.getDataRange().getValues();
  var head = vals[0];
  var idCol = head.indexOf('orderId'), stCol = head.indexOf('status');
  var n = 0;
  for (var i = 1; i < vals.length; i++) {
    if (ids.indexOf(String(vals[i][idCol])) >= 0) {
      sh.getRange(i + 1, stCol + 1).setValue('ΣΥΓΧΡΟΝΙΣΜΕΝΗ');
      n++;
    }
  }
  return jsonOut_({ ok: true, marked: n });
}

function rowToObj_(head, row) {
  var o = {};
  for (var i = 0; i < head.length; i++) o[head[i]] = row[i];
  return o;
}

function ensureSheet_(ss, name, cols) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    // ΟΛΑ ως απλό κείμενο ώστε το Sheets να ΜΗΝ μετατρέπει "27/07/2026"->ημ/νία
    // και "13:00"->ώρα (χαλάει ημερομηνίες/ώρες/κωδικούς με μηδενικά).
    sh.getRange(1, 1, sh.getMaxRows(), cols.length).setNumberFormat('@');
    sh.appendRow(cols);
    sh.setFrozenRows(1);
  }
  return sh;
}

function makeOrderId_(d) {
  function pad(n){ return ('0'+n).slice(-2); }
  var stamp = d.getFullYear() + pad(d.getMonth()+1) + pad(d.getDate()) +
              pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds());
  var rnd = Math.floor(Math.random()*900+100);
  return 'ENT-' + stamp + '-' + rnd;
}

function extractKod_(sel) {
  if (!sel) return '';
  var m = String(sel).match(/^\s*([0-9A-Za-z]+)\s*[—-]/);
  return m ? m[1] : '';
}

function jsonOut_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
