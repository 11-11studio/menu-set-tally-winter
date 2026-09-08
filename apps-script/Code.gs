/**
 * Backend "Cosa mangi oggi?" — Tally Weijl WINTER, set 8-9 settembre 2026.
 * Container-bound script: legato a un foglio Google (crea da Estensioni → Apps Script).
 * Scrive/legge le scelte pasto della troupe sul foglio "Risposte".
 */

var FOGLIO_RISPOSTE = 'Risposte';
var FOGLIO_RIEPILOGO = 'Riepilogo';
var INTESTAZIONE = ['Giorno', 'Nome', 'Gruppo', 'Primo', 'Secondo', 'Contorno', 'Note', 'Inviato (ts)', 'Aggiornato (ora server)'];
var VOCE_SALTO = '—'; // non entra nei totali, ma resta nelle risposte

/** Ritaglia una stringa a 200 caratteri, gestendo valori vuoti/mancanti. */
function pulisci_(valore) {
  var s = (valore === undefined || valore === null) ? '' : String(valore);
  return s.trim().substring(0, 200);
}

/** Il foglio può trasformare "2026-09-08" in una data: riportiamolo sempre a testo AAAA-MM-GG. */
function giornoTesto_(valore) {
  if (valore instanceof Date) {
    var tz = SpreadsheetApp.getActiveSpreadsheet().getSpreadsheetTimeZone();
    return Utilities.formatDate(valore, tz, 'yyyy-MM-dd');
  }
  return String(valore).trim();
}

/** Vero se il testo è in formato AAAA-MM-GG. */
function formatoGiornoValido_(giorno) {
  return /^\d{4}-\d{2}-\d{2}$/.test(giorno);
}

/** Recupera (creandolo se serve) il foglio Risposte con l'intestazione a posto. */
function foglioRisposte_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var foglio = ss.getSheetByName(FOGLIO_RISPOSTE);
  if (!foglio) {
    foglio = ss.insertSheet(FOGLIO_RISPOSTE);
  }
  if (foglio.getLastRow() === 0) {
    foglio.appendRow(INTESTAZIONE);
    foglio.setFrozenRows(1);
    foglio.getRange('A:A').setNumberFormat('@'); // Giorno resta testo, non data
  }
  return foglio;
}

/** Risposta JSON standard. */
function rispondi_(oggetto) {
  return ContentService.createTextOutput(JSON.stringify(oggetto))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Riceve una scelta pasto e la scrive (upsert su giorno+nome, case-insensitive/trim).
 * Corpo atteso: { giorno, nome, gruppo, primo, secondo, contorno, note, ts }
 */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // fino a 10s per evitare scritture concorrenti
  } catch (errore) {
    return rispondi_({ ok: false, errore: 'Server occupato, riprova tra poco.' });
  }

  try {
    if (!e || !e.postData || !e.postData.contents) {
      return rispondi_({ ok: false, errore: 'Corpo della richiesta mancante.' });
    }

    var dati;
    try {
      dati = JSON.parse(e.postData.contents);
    } catch (errore) {
      return rispondi_({ ok: false, errore: 'JSON non valido.' });
    }

    var giorno = pulisci_(dati.giorno);
    var nome = pulisci_(dati.nome);
    var gruppo = pulisci_(dati.gruppo);
    var primo = pulisci_(dati.primo);
    var secondo = pulisci_(dati.secondo);
    var contorno = pulisci_(dati.contorno);
    var note = pulisci_(dati.note);
    var ts = pulisci_(dati.ts);

    if (!formatoGiornoValido_(giorno)) {
      return rispondi_({ ok: false, errore: 'Giorno mancante o in formato non valido (AAAA-MM-GG).' });
    }
    if (!nome) {
      return rispondi_({ ok: false, errore: 'Nome mancante.' });
    }

    var foglio = foglioRisposte_();
    var righe = foglio.getLastRow();
    var chiaveGiorno = giorno.toLowerCase();
    var chiaveNome = nome.toLowerCase();
    var oraServer = new Date();
    var rigaTrovata = -1;

    if (righe > 1) {
      var valori = foglio.getRange(2, 1, righe - 1, 2).getValues(); // colonne Giorno, Nome
      for (var i = 0; i < valori.length; i++) {
        var gRiga = giornoTesto_(valori[i][0]).toLowerCase();
        var nRiga = String(valori[i][1]).trim().toLowerCase();
        if (gRiga === chiaveGiorno && nRiga === chiaveNome) {
          rigaTrovata = i + 2; // +2: offset intestazione + indice 1-based
          break;
        }
      }
    }

    var azione;
    // La cella del giorno va messa a testo PRIMA di scrivere, altrimenti Sheets la trasforma in data.
    if (rigaTrovata > 0) {
      azione = 'aggiornato';
    } else {
      rigaTrovata = righe + 1;
      azione = 'inserito';
    }
    foglio.getRange(rigaTrovata, 1).setNumberFormat('@');
    foglio.getRange(rigaTrovata, 1, 1, 9).setValues([[giorno, nome, gruppo, primo, secondo, contorno, note, ts, oraServer]]);

    return rispondi_({ ok: true, azione: azione });
  } catch (errore) {
    return rispondi_({ ok: false, errore: String(errore) });
  } finally {
    lock.releaseLock();
  }
}

/**
 * Legge le risposte (tutte o filtrate per giorno) e i totali per piatto.
 * Parametri GET: giorno=AAAA-MM-GG (opzionale), ping=1 (solo per test connessione).
 */
function doGet(e) {
  var parametri = (e && e.parameter) ? e.parameter : {};

  if (parametri.ping) {
    return rispondi_({ ok: true, ping: 'pong' });
  }

  var giornoFiltro = pulisci_(parametri.giorno);

  try {
    var foglio = foglioRisposte_();
    var righe = foglio.getLastRow();
    var risposte = [];
    var totaliPrimi = {};
    var totaliSecondi = {};
    var totaliContorni = {};

    if (righe > 1) {
      var valori = foglio.getRange(2, 1, righe - 1, 9).getValues();
      for (var i = 0; i < valori.length; i++) {
        var riga = valori[i];
        var giorno = giornoTesto_(riga[0]);
        if (giornoFiltro && giorno.toLowerCase() !== giornoFiltro.toLowerCase()) {
          continue;
        }
        var nome = String(riga[1]).trim();
        var gruppo = String(riga[2]).trim();
        var primo = String(riga[3]).trim();
        var secondo = String(riga[4]).trim();
        var contorno = String(riga[5]).trim();
        var note = String(riga[6]).trim();
        var ts = riga[7];

        risposte.push({
          nome: nome,
          gruppo: gruppo,
          primo: primo,
          secondo: secondo,
          contorno: contorno,
          note: note,
          ts: ts
        });

        if (primo && primo !== VOCE_SALTO) {
          totaliPrimi[primo] = (totaliPrimi[primo] || 0) + 1;
        }
        if (secondo && secondo !== VOCE_SALTO) {
          totaliSecondi[secondo] = (totaliSecondi[secondo] || 0) + 1;
        }
        if (contorno && contorno !== VOCE_SALTO) {
          totaliContorni[contorno] = (totaliContorni[contorno] || 0) + 1;
        }
      }
    }

    return rispondi_({
      ok: true,
      giorno: giornoFiltro || null,
      risposte: risposte,
      totali: { primi: totaliPrimi, secondi: totaliSecondi, contorni: totaliContorni }
    });
  } catch (errore) {
    return rispondi_({ ok: false, errore: String(errore) });
  }
}

/**
 * Da eseguire a mano dall'editor Apps Script: scrive sul foglio "Riepilogo"
 * una tabella giorno × piatto con i conteggi (comoda vista rapida per Dix).
 */
function rigeneraRiepilogo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var foglio = foglioRisposte_();
  var righe = foglio.getLastRow();

  var conteggi = {}; // { "giorno|piatto": numero }
  var giorniVisti = {};

  if (righe > 1) {
    var valori = foglio.getRange(2, 1, righe - 1, 9).getValues();
    for (var i = 0; i < valori.length; i++) {
      var giorno = giornoTesto_(valori[i][0]);
      var primo = String(valori[i][3]).trim();
      var secondo = String(valori[i][4]).trim();
      var contorno = String(valori[i][5]).trim();
      if (!giorno) continue;
      giorniVisti[giorno] = true;

      if (primo && primo !== VOCE_SALTO) {
        var chiaveP = giorno + '|Primo: ' + primo;
        conteggi[chiaveP] = (conteggi[chiaveP] || 0) + 1;
      }
      if (secondo && secondo !== VOCE_SALTO) {
        var chiaveS = giorno + '|Secondo: ' + secondo;
        conteggi[chiaveS] = (conteggi[chiaveS] || 0) + 1;
      }
      if (contorno && contorno !== VOCE_SALTO) {
        var chiaveC = giorno + '|Contorno: ' + contorno;
        conteggi[chiaveC] = (conteggi[chiaveC] || 0) + 1;
      }
    }
  }

  var giorniOrdinati = Object.keys(giorniVisti).sort();
  var righeOutput = [['Giorno', 'Piatto', 'Quante persone']];
  for (var g = 0; g < giorniOrdinati.length; g++) {
    var giornoCorrente = giorniOrdinati[g];
    var chiaviGiorno = Object.keys(conteggi).filter(function (k) {
      return k.indexOf(giornoCorrente + '|') === 0;
    }).sort();
    for (var k = 0; k < chiaviGiorno.length; k++) {
      var chiave = chiaviGiorno[k];
      var piatto = chiave.substring(giornoCorrente.length + 1);
      righeOutput.push([giornoCorrente, piatto, conteggi[chiave]]);
    }
  }

  var foglioRiepilogo = ss.getSheetByName(FOGLIO_RIEPILOGO);
  if (!foglioRiepilogo) {
    foglioRiepilogo = ss.insertSheet(FOGLIO_RIEPILOGO);
  }
  foglioRiepilogo.clear();
  foglioRiepilogo.getRange(1, 1, righeOutput.length, 3).setValues(righeOutput);
  foglioRiepilogo.setFrozenRows(1);
  foglioRiepilogo.autoResizeColumns(1, 3);
}

/** Da eseguire a mano: cancella le righe di prova (nome che inizia con "Test"). */
function cancellaRigheDiTest() {
  var foglio = foglioRisposte_();
  var righe = foglio.getLastRow();
  for (var r = righe; r >= 2; r--) {
    var nome = String(foglio.getRange(r, 2).getValue()).trim().toLowerCase();
    if (nome.indexOf('test') === 0) foglio.deleteRow(r);
  }
}
