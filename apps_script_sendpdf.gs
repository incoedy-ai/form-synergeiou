// ============================================================
// ΝΕΟ: Αποστολή PDF (Πιστοποιητικό / Έκθεση Αυτοψίας) στο email του πελάτη.
//
// ΟΔΗΓΙΕΣ:
// 1. Στον editor του Apps Script, μέσα στη ΣΥΝΑΡΤΗΣΗ "function doPost(e) {"
//    πρόσθεσε ΣΤΗΝ ΑΡΧΗ (πριν από "var ss = SpreadsheetApp..."), αυτές τις
//    3 γραμμές:
//
//      var data0 = JSON.parse(e.postData.contents);
//      if (data0.form === 'sendPdf') return handleSendPdf_(data0);
//
//    (Αν το doPost ήδη κάνει JSON.parse σε μεταβλητή "data" στην πρώτη
//    γραμμή του σώματος, απλά πρόσθεσε ΜΕΤΑ από εκείνη τη γραμμή:
//      if (data.form === 'sendPdf') return handleSendPdf_(data);
//    ώστε να μη γίνεται JSON.parse δύο φορές.)
//
// 2. Πρόσθεσε ΟΛΟΚΛΗΡΗ τη συνάρτηση handleSendPdf_ παρακάτω ΚΑΠΟΥ ΕΚΤΟΣ
//    του doPost/doGet (π.χ. στο τέλος του αρχείου).
//
// 3. Deploy > Manage deployments > ✏️ στο υπάρχον deployment >
//    Version: New version > Deploy.
//
// 4. ΠΡΟΣΟΧΗ — πρώτη φορά που θα τρέξει η GmailApp.sendEmail, το Apps
//    Script θα ζητήσει ΝΕΑ έγκριση (authorization) για δικαιώματα Gmail +
//    Drive. Δώσε την έγκριση με τον ίδιο λογαριασμό Google που "κατέχει"
//    το script (αυτός θα εμφανίζεται ως αποστολέας του email).
//
// 5. ΓΝΩΣΤΟΣ ΠΕΡΙΟΡΙΣΜΟΣ (να τσεκαριστεί στην πράξη): η μετατροπή
//    HTML → PDF εδώ γίνεται μέσω του μηχανισμού του Google Drive
//    (DriveApp file.getAs('application/pdf')). Αυτός ο μετατροπέας δεν
//    υποστηρίζει 100% flexbox/CSS grid/absolute positioning όπως ένας
//    πραγματικός browser — πιθανό να χρειαστεί οπτικός έλεγχο του πρώτου
//    PDF που θα σταλεί και, αν το layout βγει χαλασμένο, να αλλάξουμε
//    μέθοδο (π.χ. headless Chrome μέσω ενός μικρού server) αντί αυτής.
// ============================================================

function handleSendPdf_(data) {
  try {
    var filenameBase = (data.doc === 'ecert' ? 'Πιστοποιητικό Εφαρμογών' : 'Έκθεση Αυτοψίας') +
      (data.pelatis ? ' - ' + data.pelatis : '') + ' - ' + Utilities.formatDate(new Date(), 'Europe/Athens', 'dd-MM-yyyy');

    var htmlBlob = Utilities.newBlob(data.html, 'text/html', filenameBase + '.html');
    var tempFile = DriveApp.createFile(htmlBlob);
    var pdfBlob = tempFile.getAs('application/pdf').setName(filenameBase + '.pdf');
    tempFile.setTrashed(true); // δεν κρατάμε το ενδιάμεσο .html — μόνο αρχειοθέτηση cloud θα αποφασιστεί σε επόμενο βήμα

    var subject = (data.doc === 'ecert' ? 'Πιστοποιητικό Εφαρμογών' : 'Έκθεση Αυτοψίας') + ' — InCo';
    var body = 'Καλησπέρα' + (data.pelatis ? ' ' + data.pelatis : '') + ',\n\n' +
      'Επισυνάπτεται το ' + (data.doc === 'ecert' ? 'πιστοποιητικό εφαρμογών' : 'έκθεση αυτοψίας') + ' από την πρόσφατη επίσκεψή μας.\n\n' +
      'Για οποιαδήποτε διευκρίνιση είμαστε στη διάθεσή σας.\n\n' +
      'InCo';

    GmailApp.sendEmail(data.email, subject, body, { attachments: [pdfBlob], name: 'InCo' });

    return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
