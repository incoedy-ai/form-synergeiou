/**
 * INCO — Αποθήκευση Εντολών Εφαρμογής
 * Δέχεται POST (JSON) από τη web φόρμα (form_synergeiou.html) και γράφει:
 *   - φύλλο "ΕΝΤΟΛΕΣ"        → μία γραμμή κεφαλίδας ανά εντολή
 *   - φύλλο "ΕΝΤΟΛΕΣ_ΥΛΙΚΑ"  → μία γραμμή ανά υλικό
 * Τα φύλλα δημιουργούνται αυτόματα αν λείπουν.
 * Η υπογραφή αποθηκεύεται ως base64 (PNG) στη στήλη ΥΠΟΓΡΑΦΗ.
 */

var HEADER_COLS = [
  'orderId','timestamp','kod','pelatis','diey','dieyEf','imer','ora','och',
  'kat','trop','xrew','fpaPct','katharo','fpaPoso','enanti','ypol','exof',
  'da','tda','tpy','apy','eaee','simSyn','signature','status'
];
var LINE_COLS = ['orderId','lineNo','typ','met','skevasma','kodSkevasma','pak','q1','q2'];

function doGet(e) {
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

    // --- Κεφαλίδα ---
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

    // --- Γραμμές υλικών ---
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

function ensureSheet_(ss, name, cols) {
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
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

// "148 — TETRAX" → "148"  (αλλιώς κενό)
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
