# Nutella Index — Documentazione del Progetto

Sito statistico indipendente che misura il potere d'acquisto nei diversi paesi del mondo usando il prezzo della Nutella come riferimento, in stile Big Mac Index.

---

## Cosa fa il sito

### Schede pubbliche

| Scheda | URL | Descrizione |
|---|---|---|
| **Dashboard** | `/` | Pagina pubblica con mappa, tabella e due grafici: **Nutella PPP Index** (sopra/sottovalutazione valute) e **Nutella Fatica** (minuti di lavoro per 100g). Dati verificati e inseriti manualmente. |
| **Nutella PPP** | `/ppp-index` | Calcolatore interattivo: scegli un paese, inserisci il prezzo del vasetto, il sito mostra valuta e tasso di cambio automaticamente e calcola se la valuta locale è sopra o sottovalutata rispetto all'Euro. |
| **Calcolo Istantaneo** | `/instant-calculator` | Due tab integrate: **Calcolo dal prezzo** (inserisci paese, peso, prezzo → ottieni i minuti di lavoro necessari) e **Equivalenza in Italia** (quei minuti cosa comprerebbero in Italia). Le due tab si alimentano a vicenda ma sono usabili anche separatamente. |
| **Metodologia** | `/methodology` | Spiegazione del metodo di calcolo dell'indice. |
| **Invia segnalazione** | `/submit-link` | Form pubblico per inviare rilevazioni di prezzo (con foto e reCAPTCHA v3 anti-spam invisibile). I dati vanno in Firestore con status `pending` in attesa di verifica admin. |

### Schede admin (protette da login)

---

## Architettura

- **Frontend**: Angular v21, standalone components, Tailwind CSS
- **SEO**: pagine pubbliche pre-generate in HTML statico durante la build (prerender), versione italiana su `/` e inglese su `/en/`; login e admin restano generate nel browser
- **Database**: Firebase Firestore (collezioni: `submissions`, `measurements`, `countries`, `areas`)
- **Piano Firebase**: Spark (gratuito). Cloud Storage non è usato perché richiede il piano a pagamento Blaze; le foto sono link salvati nel campo `photo_url`
- **Auth**: Firebase Authentication (email/password, solo admin)
- **Hosting**: Firebase Hosting
- **Dati statici**: JSON locali in `src/app/` (PIL, paesi, valute, dati admin dashboard)

### File dati principali

| File | Contenuto |
|---|---|
| `src/app/nutella-data.json` | Lista paesi + PIL pro capite per anno (fonte IMF) |
| `src/app/admin-data.json` | Dati verificati per la dashboard (PPP + minuti fatica) — **aggiornare manualmente** |
| `src/app/currency-data.json` | Valuta e tasso di cambio per ogni paese (generato da `gen_data.py`) |
| `src/app/paesi-ita.json` | Lista paesi in italiano, ordine alfabetico italiano |
| `src/app/ita-to-eng.json` | Mappa nome italiano → nome inglese (per lookup PIL) |
| `src/app/shared/tiers.ts` | Fasce di prezzo italiane per l'equivalenza |
| `src/app/shared/nutella-math.ts` | Formule dell'indice e riferimento Italia, calcolato dall'ultima rilevazione italiana su Firestore |

---

## Variabili di configurazione

Le credenziali Firebase vanno in `src/environments/environment.ts` (non committare questo file).

Copia il template e compila con i tuoi dati:

```bash
cp src/environments/environment.example.ts src/environments/environment.ts
```

```typescript
export const environment = {
  production: false,
  firebase: {
    apiKey: "<API_KEY>",
    authDomain: "<PROJECT_ID>.firebaseapp.com",
    projectId: "<PROJECT_ID>",
    storageBucket: "<PROJECT_ID>.firebasestorage.app",
    messagingSenderId: "<SENDER_ID>",
    appId: "<APP_ID>"
  }
};
```

Trovi tutti questi valori nella **Console Firebase → Impostazioni progetto → Le tue app**.

---

## Setup iniziale (prima volta)

```bash
# 1. Installa dipendenze Node
npm install

# 2. Installa Firebase CLI globalmente
npm install -g firebase-tools

# 3. Configura le variabili Firebase
cp src/environments/environment.example.ts src/environments/environment.ts
# → modifica environment.ts con le tue credenziali

# 4. Login Firebase
firebase login
```

---

## Sviluppo locale

```bash
# Avvia il server di sviluppo Angular
npx ng serve
# → http://localhost:4200
```

---

## Deploy su Firebase

### Comando completo (build + deploy in un colpo)

```bash
npm run build && firebase deploy --only hosting,firestore:rules
```

### Passo per passo

```bash
# 1. Build (prerender IT + EN e copia di 404.html)
npm run build

# 2. Verifica le regole senza pubblicarle
firebase deploy --only firestore:rules --dry-run

# 3. Deploy di hosting e regole Firestore
firebase deploy --only hosting,firestore:rules
```

Le regole di sicurezza vivono in `firestore.rules` e vanno sempre pubblicate insieme al sito:
un deploy "solo hosting" lascia in produzione le regole precedenti.

Se il login Firebase è scaduto:
```bash
firebase login --reauth
```
---

## Traduzioni (italiano / inglese)

I testi sono in italiano nei template, marcati con `i18n="@@id"` (HTML) o `$localize` (TypeScript).
Dopo aver aggiunto o modificato un testo:

```bash
npx ng extract-i18n        # aggiorna src/locale/messages.xlf
```

Poi aggiungi o aggiorna la traduzione corrispondente in `src/locale/messages.en.xlf`.
La build segnala le traduzioni mancanti. In sviluppo (`npm start`) viene servita solo la versione italiana.

---

## Aggiornare i dati della Dashboard

I dati della dashboard (grafici PPP e Fatica) sono in `src/app/admin-data.json`.

Ogni voce ha questa struttura:

```json
{
  "country": "Nome Paese (inglese)",
  "area": "Europe | Americas | Asia | Oceania | Africa",
  "euro_per_100g": 1.05,
  "exchange_rate": 1.00,
  "minutes_per_100g": 2.10
}
```

Dopo aver modificato il file, esegui build e deploy.

---

## Aggiornare valute e tassi di cambio

I tassi di cambio sono in `doc/Elenco_Paesi_in_italiano.xlsx` (scheda `Valute`).

Per rigenerare i JSON:

```bash
python gen_data.py
```

Questo sovrascrive `currency-data.json`, `paesi-ita.json` e `ita-to-eng.json`.

---

## Struttura del progetto

```
.
├── src/
│   ├── app/
│   │   ├── dashboard/          # Grafici PPP + Fatica (dati admin)
│   │   ├── ppp-index/          # Calcolatore PPP interattivo
│   │   ├── instant-calculator/ # Calcolo istantaneo + Equivalenza (2 tab)
│   │   ├── equivalency/        # Scheda equivalenza standalone
│   │   ├── link-submission/    # Form invio segnalazioni pubbliche
│   │   ├── admin/              # Pannello admin (protetto)
│   │   ├── login/              # Login Firebase
│   │   ├── methodology/        # Pagina metodologia
│   │   ├── shared/tiers.ts     # Fasce prezzo + costanti
│   │   ├── admin-data.json     # Dati dashboard (aggiornare manualmente)
│   │   ├── nutella-data.json   # PIL per paese
│   │   ├── currency-data.json  # Valute e tassi di cambio
│   │   └── data.service.ts     # Servizio Firestore
│   └── environments/
│       ├── environment.ts          # Credenziali Firebase (NON committare)
│       └── environment.example.ts  # Template credenziali
├── doc/
│   ├── Elenco_Paesi_in_italiano.xlsx  # Fonte dati paesi + valute
│   └── Dati_PIL_in_italiano.xls       # Fonte dati PIL
├── gen_data.py        # Script per rigenerare i JSON da Excel
├── firebase.json      # Config Firebase Hosting + Firestore
└── .firebaserc        # Alias progetto Firebase (lgrdg)
```

---

## Controlli automatici (CI)

`.github/workflows/ci.yml` esegue a ogni push e pull request: `npm ci`, build completa (IT + EN, con un `environment.ts` di esempio), test unitari e `npm audit` sulle dipendenze di produzione (blocca solo le vulnerabilità critiche). Non pubblica nulla: il deploy resta manuale.

---

## Note GDPR

> Punti aperti da valutare con il DPO: vedi [docs/nota-dpo-gdpr.md](docs/nota-dpo-gdpr.md).

- **Cookie banner**: compare al primo accesso, la scelta viene salvata in `localStorage`
- **Form segnalazioni**: include informativa art. 13 GDPR prima del tasto invio
- I dati inviati dagli utenti (prezzo, città, foto) vengono salvati su Firestore con status `pending` e non sono mai mostrati pubblicamente prima della verifica admin
