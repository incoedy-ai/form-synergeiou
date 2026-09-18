/* ─────────────────────────────────────────────────────────────────────────
   Δελτίο επίσκεψης ΜΕΣΑ από τον πίνακα καταγραφών  (18/09/2026)

   Ο πίνακας δείχνει τη σεζόν· το δελτίο δείχνει ΜΙΑ επίσκεψη, υπογεγραμμένη.
   Το ίδιο έγγραφο αρχειοθετείται και ως PDF στον φάκελο My InCo του πελάτη
   (tools/deltio_episkepsis_pdf.py) — εδώ φτιάχνεται στον browser, από τα ίδια
   δεδομένα και με το ΙΔΙΟ έντυπο (deltio_episkepsis_print.html), ώστε να μην
   υπάρχουν δύο μορφές που ξεφεύγουν η μία από την άλλη.

   ⚠️ Το παράθυρο ανοίγει ΣΥΓΧΡΟΝΑ με το πάτημα και γεμίζει μετά: αν το
   ανοίγαμε μέσα στο .then() του fetch, θα το έκοβε ο αποκλεισμός αναδυόμενων.
   ───────────────────────────────────────────────────────────────────────── */
const DELTIO = (function () {
  const RIZA = new URL('.', document.currentScript.src).href;
  const ENTYPO = RIZA + 'deltio_episkepsis_print.html';

  // Ο τεχνικός που διάλεξε το συνεργείο ΕΙΝΑΙ ο υπεύθυνος επιστήμονας.
  const EPISTIMONES = {
    'ΑΡΧΙΜΗΔΗΣ': ['ΑΡΧΙΜΗΔΗΣ Λ. ΤΡΥΦΩΝΙΔΗΣ', 'sig_trifonidis.png', ''],
    'ΒΑΓΓΕΛΗΣ': ['ΕΥΑΓΓΕΛΟΣ Κ. ΚΑΡΑΒΑΣΟΠΟΥΛΟΣ', 'sig_karavasilis.png', 'kar']
  };
  const PROEPILOGI = 'ΑΡΧΙΜΗΔΗΣ';
  const ORIO_DIO_STILON = 8;          // ίδιο όριο με το PDF

  /* Ο κωδικός στη διεύθυνση μπορεί να είναι με ΕΛΛΗΝΙΚΑ γράμματα (Α789), ενώ ο
     αριθμός δελτίου γράφεται με λατινικά — ίδιος κανόνας με το PDF και το φύλλο. */
  const OMOGRAFA = {'Α':'A','Β':'B','Ε':'E','Ζ':'Z','Η':'H','Ι':'I','Κ':'K',
                    'Μ':'M','Ν':'N','Ο':'O','Ρ':'P','Τ':'T','Υ':'Y','Χ':'X'};
  const normKod = k => String(k || '').trim().toUpperCase()
    .split('').map(c => OMOGRAFA[c] || c).join('');

  const esc = t => String(t == null ? '' : t)
    .replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* Κατανάλωση/συλλήψεις > 0 = εύρημα. Το «0» είναι καθαρός σταθμός, όχι κενό. */
  function einaiEvrima(v) {
    const s = String(v == null ? '' : v).trim().replace(',', '.');
    if (!s) return false;
    const n = Number(s);
    return isNaN(n) ? ['ΟΧΙ', '-'].indexOf(s.toUpperCase()) < 0 : n > 0;
  }

  /* Ένας πίνακας, ή δύο δίπλα-δίπλα όταν οι σταθμοί είναι πολλοί. */
  function pinakakia(seires, stili) {
    const kef = '<thead><tr><th style="width:62%">Σταθμός</th>' +
                '<th class="c">' + esc(stili) + '</th></tr></thead>';
    if (seires.length <= ORIO_DIO_STILON)
      return '<table class="mat">' + kef + '<tbody>' + seires.join('') + '</tbody></table>';
    const misa = Math.ceil(seires.length / 2);
    return '<div class="duo">' + [seires.slice(0, misa), seires.slice(misa)].map(m =>
      '<div><table class="mat">' + kef + '<tbody>' + m.join('') + '</tbody></table></div>'
    ).join('') + '</div>';
  }

  /* rows: [{stathmos, typos, timi}] μιας ημέρας */
  function pinakasMyoktonia(rows) {
    const onomata = {
      'ΔΣ': ['ΔΟΛΩΜΑΤΙΚΟΙ ΣΤΑΘΜΟΙ — ποσοστό κατανάλωσης (%)', 'Κατανάλωση %'],
      'ΣΕ': ['ΣΗΜΕΙΑ ΕΛΕΓΧΟΥ — αριθμός συλλήψεων', 'Συλλήψεις']
    };
    let meros = [], plithos = 0, evrimata = 0;
    ['ΔΣ', 'ΣΕ'].forEach(typos => {
      const seira = rows.filter(r => String(r.typos || '').toUpperCase().indexOf(typos) >= 0)
                        .sort((a, b) => String(a.stathmos).localeCompare(String(b.stathmos)));
      if (!seira.length) return;
      const seires = seira.map(r => {
        const hit = einaiEvrima(r.timi);
        plithos++; if (hit) evrimata++;
        return '<tr class="' + (hit ? 'hit' : '') + '"><td>' + esc(r.stathmos) +
               '</td><td class="c">' + esc(r.timi) + '</td></tr>';
      });
      meros.push('<div class="omada"><div class="omada-t">' + esc(onomata[typos][0]) +
                 '</div>' + pinakakia(seires, onomata[typos][1]) + '</div>');
    });
    return {
      pinakas: meros.join('') || '<p>Καμία καταγραφή.</p>',
      synopsi: [['Σταθμοί ελέγχου', plithos, false], ['Με εύρημα', evrimata, evrimata > 0],
                ['Καθαροί', plithos - evrimata, false]]
    };
  }

  /* Παγίδες: κρατάμε μόνο τις στήλες ειδών που έχουν τιμή έστω σε μία γραμμή. */
  function pinakasPagides(kef, rows, eidiApo, eidiEos, extra, leksi) {
    const kel = (r, i) => String(r[i] == null ? '' : r[i]).trim();
    const energes = [];
    for (let i = eidiApo; i < Math.min(eidiEos, kef.length); i++)
      if (rows.some(r => kel(r, i))) energes.push(i);
    const kefalides = ['Θέση'].concat(energes.map(i => kef[i]), extra.map(e => e[1]));
    let plithos = 0, evrimata = 0;
    const seires = rows.slice().sort((a, b) => kel(a, 2).localeCompare(kel(b, 2))).map(r => {
      let hit = false;
      const kelia = [esc(kel(r, 2))];
      energes.forEach(i => { if (einaiEvrima(kel(r, i))) hit = true; kelia.push(esc(kel(r, i))); });
      extra.forEach(e => kelia.push(esc(kel(r, e[0]))));
      plithos++; if (hit) evrimata++;
      return '<tr class="' + (hit ? 'hit' : '') + '">' +
        kelia.map((c, j) => j ? '<td class="c">' + c + '</td>' : '<td>' + c + '</td>').join('') +
        '</tr>';
    });
    return {
      pinakas: '<table class="mat"><thead><tr>' +
        kefalides.map((h, j) => '<th class="' + (j ? 'c' : '') + '">' + esc(h) + '</th>').join('') +
        '</tr></thead><tbody>' + seires.join('') + '</tbody></table>',
      synopsi: [['Θέσεις ελέγχου', plithos, false], [leksi, evrimata, evrimata > 0],
                ['Καθαρές', plithos - evrimata, false]]
    };
  }

  /* Τα στοιχεία πελάτη έρχονται ως παράμετροι της διεύθυνσης, όπως τα γράφει
     η συντόμευση του φακέλου. Τα κενά ΔΕΝ εμφανίζονται. */
  function blokPelati(P, kod) {
    const g = n => { try { return decodeURIComponent(P.get(n) || '').trim(); } catch (e) { return ''; } };
    const epon = g('pelatis'), diakr = g('diakr'), skafos = g('skafos'),
          drast = g('drast'), diey = g('diey'), per = g('periohi'),
          tk = g('tk'), limani = g('limani');
    let dief = [diey, per].filter(Boolean).join(', ');
    if (tk) dief = (dief + ' ' + tk).trim();
    let zeugi = [['Πελάτης', [kod, epon].filter(Boolean).join(' · ')],
                 ['Διακριτικός τίτλος', diakr], ['Όνομα σκάφους', skafos],
                 ['Δραστηριότητα', drast], ['Διεύθυνση εφαρμογής', dief],
                 ['Λιμάνι ελλιμενισμού', limani]];
    if (diakr && epon && epon.toUpperCase().indexOf(diakr.toUpperCase()) >= 0)
      zeugi = zeugi.filter(z => z[0] !== 'Διακριτικός τίτλος');
    return zeugi.filter(z => z[1]).map(z =>
      '<div class="item' + (['Πελάτης', 'Διεύθυνση εφαρμογής'].indexOf(z[0]) >= 0 ? ' olo' : '') +
      '"><div class="l">' + esc(z[0]) + '</div><div class="v">' + esc(z[1]) + '</div></div>'
    ).join('');
  }

  function blokParatiriseon(par, dio) {
    const kouti = (t, k, adeio) =>
      '<div><div class="omada-t">' + t + '</div>' +
      (k ? '<div class="keimeno">' + esc(k) + '</div>'
         : '<div class="keimeno empty">' + adeio + '</div>') + '</div>';
    return '<div class="section"><div class="st">ΠΑΡΑΤΗΡΗΣΕΙΣ ΚΑΙ ΔΙΟΡΘΩΤΙΚΕΣ ΕΝΕΡΓΕΙΕΣ</div>' +
      '<div class="sb"><div class="duo">' +
      kouti('ΠΑΡΑΤΗΡΗΣΕΙΣ', par, 'Δεν καταγράφηκαν παρατηρήσεις.') +
      kouti('ΔΙΟΡΘΩΤΙΚΕΣ ΕΝΕΡΓΕΙΕΣ', dio, 'Δεν απαιτήθηκαν διορθωτικές ενέργειες.') +
      '</div></div></div>';
  }

  /* «10/09/26» -> {imera:'10/09/2026', arith:'20260910'} */
  function imerominia(d) {
    const m = String(d || '').match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (!m) return { imera: String(d || ''), arith: '' };
    const p2 = n => String(n).padStart(2, '0');
    const etos = m[3].length === 2 ? '20' + m[3] : m[3];
    return { imera: p2(m[1]) + '/' + p2(m[2]) + '/' + etos,
             arith: etos + p2(m[2]) + p2(m[1]) };
  }

  const KOUMPI_EKTYPOSIS =
    '<div class="noprint" style="text-align:center;margin:14px 0 4px">' +
    '<button onclick="window.print()" style="padding:10px 26px;font-size:14px;font-weight:bold;' +
    'background:#287B9B;color:#fff;border:none;border-radius:6px;cursor:pointer">' +
    'Εκτύπωση / Αποθήκευση σε PDF</button></div>' +
    '<style>@media print{.noprint{display:none!important}}</style>';

  /* cfg: {titlos, prothema, kod, d, pinakas, synopsi, texnikos, par, dio, P} */
  function anoixe(cfg) {
    const w = window.open('', '_blank');          // ΣΥΓΧΡΟΝΑ, πριν το fetch
    if (!w) { alert('Ο browser εμπόδισε το άνοιγμα. Επίτρεψε τα αναδυόμενα παράθυρα.'); return; }
    w.document.write('<!doctype html><meta charset="utf-8"><title>Δελτίο επίσκεψης</title>' +
                     '<p style="font:14px system-ui;padding:24px">Ετοιμάζεται το δελτίο…</p>');
    fetch(ENTYPO).then(r => r.text()).then(t => {
      const im = imerominia(cfg.d), kod = normKod(cfg.kod);
      const e = EPISTIMONES[String(cfg.texnikos || '').trim().toUpperCase()] ||
                EPISTIMONES[PROEPILOGI];
      const antik = {
        '{{LOGO_IMG}}': '<img class="logo" src="' + RIZA + 'assets/logo_entoli.png" alt="InCo">',
        '{{TITLOS}}': esc(cfg.titlos),
        '{{ARITHMOS}}': cfg.prothema + '-' + kod + '-' + im.arith,
        '{{IMEROMINIA}}': im.imera,
        '{{PELATIS}}': blokPelati(cfg.P, kod),
        '{{SYNOPSI}}': cfg.synopsi.map(s =>
          '<div class="b' + (s[2] ? ' hi' : '') + '"><div class="n">' + s[1] +
          '</div><div class="t">' + esc(s[0]) + '</div></div>').join(''),
        '{{PINAKAS}}': cfg.pinakas,
        '{{PARATIRISEIS}}': cfg.par !== undefined ? blokParatiriseon(cfg.par, cfg.dio) : '',
        '{{TEXNIKOS}}': esc(e[0]),
        '{{SFRAGIDA}}': '<img class="' + e[2] + '" src="' + RIZA + e[1] + '" alt="Σφραγίδα">',
        '{{GEN_DATE}}': new Date().toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })
      };
      Object.keys(antik).forEach(k => { t = t.split(k).join(antik[k]); });
      t = t.replace('</body>', KOUMPI_EKTYPOSIS + '</body>');
      w.document.open(); w.document.write(t); w.document.close();
      w.document.title = cfg.prothema + '-' + kod + '-' + im.arith;
    }).catch(() => {
      w.document.body.innerHTML = '<p style="font:14px system-ui;padding:24px">' +
        'Το δελτίο δεν φορτώθηκε. Δοκιμάστε ξανά.</p>';
    });
  }

  return { anoixe, pinakasMyoktonia, pinakasPagides };
})();
