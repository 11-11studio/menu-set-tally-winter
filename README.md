# Cosa mangi oggi? — menu set Tally Weijl WINTER

Pagina web per far scegliere alla troupe primo/secondo del giorno (set 8-9 settembre 2026, Nero Studio Roma). Ogni persona apre il link, sceglie, invia; la cucina (o chi ordina in trattoria) vede i totali e copia l'ordine per WhatsApp.

## Struttura dei file

- `index.html` — la pagina statica: modulo per la troupe e vista Cucina, loghi già incorporati.
- `apps-script/Code.gs` — il backend: riceve le scelte e le scrive su un Google Sheet.
- `apps-script/test-endpoint.sh` — script per testare il Web App da terminale (aggiunge una riga «Test Claudio»: poi lanciare `cancellaRigheDiTest` dall'editor Apps Script).
- `assets/` — i loghi sorgente (11:11 e Tally Weijl), già incorporati in `index.html`: non serve caricarli su GitHub.
- `crea-repo.sh` — script per creare il repo GitHub e pubblicarlo (vedi Passo 3).

Tre cose da fare col browser, in ordine.

## Passo 1 — Il foglio Google (già fatto l'08/09/2026: foglio «Pasti set Tally Weijl WINTER» nel Drive di info@11-11stud.io, deploy versione 3)

Con l'account **info@11-11stud.io**:

1. Vai su Google Sheets e crea un foglio nuovo, chiamalo **"Pasti set Tally Weijl WINTER"**.
2. Menu **Estensioni → Apps Script**.
3. Cancella il codice di esempio e incolla dentro tutto il contenuto di `apps-script/Code.gs`.
4. Salva (icona dischetto o `Cmd+S`).
5. In alto a destra, **Deploy → Nuova distribuzione**.
6. Tipo: **App web**.
7. Esegui come: **Me**. Chi può accedere: **Chiunque**.
8. **Distribuisci**. Ti chiede di autorizzare: se compare "Google non ha verificato questa app" → **Avanzate → vai a [nome progetto] (non sicuro)** → consenti.
9. Copia l'URL che finisce con **`/exec`**: è il tuo endpoint.

**Importante:** ogni volta che modifichi `Code.gs`, l'URL `/exec` resta lo stesso ma serve comunque una nuova versione, altrimenti continua a girare il codice vecchio: **Deploy → Gestisci distribuzioni → matita (modifica) → Versione: Nuova versione → Distribuisci**.

## Passo 2 — Incolla l'URL in index.html (già fatto: l'URL /exec è dentro index.html)

Apri `index.html`, in cima trovi un blocco tipo:

```js
const CONFIG = {
  ENDPOINT: "", // <-- incolla qui l'URL /exec
  ...
};
```

Incolla l'URL copiato al Passo 1 tra le virgolette.

**Test rapido:** apri nel browser `<il tuo URL>/exec?ping=1`. Deve rispondere:

```json
{"ok":true,"ping":"pong"}
```

Se invece vedi una pagina HTML di login Google, il deploy non è "Chiunque" — torna al Passo 1.

## Passo 3 — GitHub Pages (già fatto l'08/09/2026)

Il repo esiste già sull'account GitHub **11-11studio**: <https://github.com/11-11studio/menu-set-tally-winter>, con GitHub Pages attivo su `main` / root.
Il link della pagina è **https://11-11studio.github.io/menu-set-tally-winter/**. Consiglio: accorcialo o fanne un QR per mandarlo su WhatsApp alla troupe.

`crea-repo.sh` serve solo se un giorno vuoi rifare il repo da zero da terminale (richiede `gh auth login` sull'account 11-11studio).

## Come si aggiorna il menu di mercoledì

Apri `index.html`, cerca `CONFIG.GIORNI` in cima al file. È un elenco tipo:

```js
GIORNI: [
  { id: "2026-09-08", label: "Martedì 8 · DAY 01 Winter", aperto: true,
    primi: ["Risotto alla pescatora", "Gricia", "..."],
    secondi: ["Orata in crosta di patate", "Costine", "..."],
    contorni: ["Broccoli", "Patate"] },
  { id: "2026-09-09", label: "Mercoledì 9 · DAY 02 Christmas", aperto: false,
    primi: [], secondi: [], contorni: [] }
]
```

Per mercoledì: metti i piatti nelle tre liste e cambia `aperto: false` in `aperto: true`. Senza contorni la sezione contorno sparisce da sola.

Per pubblicare la modifica **senza terminale**: su GitHub apri `index.html` → matita (Edit) → incolla il nuovo contenuto → **Commit changes**. Oppure **Add file → Upload files** e trascina il nuovo `index.html` sopra quello vecchio. In circa 1 minuto GitHub Pages aggiorna la pagina online.

La copia di riferimento di `index.html` sta nel vault, in `11_11studio/Produzioni/2-TallyWeijl/06-Craft-e-catering/menu-web/`: modifica prima quella, poi caricala.

## Vista Cucina

`https://11-11studio.github.io/menu-set-tally-winter/#cucina` mostra i totali per piatto del giorno e un pulsante **"Copia ordine"** che prepara il testo pronto da incollare su WhatsApp alla trattoria.

## Privacy

Sul foglio Google finiscono solo nome, gruppo/reparto, piatti scelti (primo, secondo, contorno) ed eventuali note — niente dati sensibili. L'URL del Web App è pubblico (chiunque ce l'abbia può mandare dati), ma scrive solo su quel foglio, non su altro.

## Problemi comuni

- **La chiamata risponde con una pagina HTML invece che JSON** → il deploy non è impostato su "Chiunque" può accedere. Rifai il deploy (Passo 1).
- **Errore 403** → hai modificato `Code.gs` ma non hai creato una nuova versione della distribuzione (vedi nota nel Passo 1).
- **La pagina mostra "DEMO" o non manda nulla** → `CONFIG.ENDPOINT` è vuoto in `index.html`: manca il Passo 2.
