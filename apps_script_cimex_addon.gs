// ============================================================
// CIMEX (κοριοί) — ΠΡΟΣΘΗΚΗ branch στο ΥΠΑΡΧΟΝ doPost
// (ΜΗΝ αντικαταστήσεις όλο το doPost — έχει normalizeKod/sendPdf/kod/pelatis)
//
// ΟΔΗΓΙΕΣ:
// 1. Μέσα στο doPost, βρες ΠΡΟΣ ΤΟ ΤΕΛΟΣ τη γραμμή:
//        } else {
//    (αυτή ακριβώς πριν από το:  var sheet = ss.getSheets()[0];)
// 2. Αντικατέστησε ΜΟΝΟ αυτή τη μία γραμμή  "} else {"  με ΟΛΟ το παρακάτω μπλοκ.
// 3. Deploy > Manage deployments > ✏️ > New version > Deploy.
// ============================================================

  } else if (data.form === 'cimex') {
    // ---- ΚΟΡΙΟΙ (Cimex lectularius) ----
    var rooms = data.rooms || [];
    var roomNames = [], totalUnits = 0, cleanUnits = 0, maxLvl = 0;
    rooms.forEach(function(r) {
      roomNames.push(r.name);
      (r.units || []).forEach(function(u) {
        totalUnits++;
        if (u.clean || !(u.level > 0)) cleanUnits++;
        if ((u.level || 0) > maxLvl) maxLvl = u.level || 0;
      });
    });

    var koSheet = ss.getSheetByName('ΚΟΡΙΟΙ');
    if (!koSheet) {
      koSheet = ss.insertSheet('ΚΟΡΙΟΙ');
      koSheet.appendRow([
        'Timestamp', 'Κωδικός', 'Πελάτης', 'Ημερομηνία',
        'Χώροι', 'Μονάδες', 'Μονάδες Καθαρές', 'Μέγιστο Επίπεδο',
        'Σύσταση', 'Σημειώσεις', 'Για τον Έλεγχο'
      ]);
    }
    koSheet.appendRow([
      now, kod, pelatis, data.date || '',
      roomNames.join(', '), totalUnits, cleanUnits, maxLvl,
      data.systasi || '', data.notes || '', data.giaTonElegxo || ''
    ]);

    var koDet = ss.getSheetByName('ΚΟΡΙΟΙ_ΕΥΡΗΜΑΤΑ');
    if (!koDet) {
      koDet = ss.insertSheet('ΚΟΡΙΟΙ_ΕΥΡΗΜΑΤΑ');
      koDet.appendRow([
        'Timestamp', 'Κωδικός', 'Πελάτης', 'Ημερομηνία',
        'Χώρος', 'Μονάδα', 'Τύπος', 'Σημείο Ελέγχου', 'Ευρήματα', 'Επίπεδο'
      ]);
    }
    rooms.forEach(function(r) {
      (r.units || []).forEach(function(u) {
        if (u.clean || !(u.points && u.points.length)) {
          koDet.appendRow([now, kod, pelatis, data.date || '',
            r.name, u.name, u.type, '(καθαρό — κανένα εύρημα)', '', 0]);
        } else {
          u.points.forEach(function(pt) {
            koDet.appendRow([now, kod, pelatis, data.date || '',
              r.name, u.name, u.type, pt.point, (pt.evidence || []).join(', '), pt.level]);
          });
        }
      });
    });

  } else {
