# Nutella Index — Documentazione del Progetto

Sito statistico indipendente che misura il potere d'acquisto nei diversi paesi del mondo usando il prezzo della Nutella come riferimento, in stile Big Mac Index.

---

## Cosa fa il sito

### Schede pubbliche

| Scheda | URL | Descrizione |
|---|---|---|
| **Dashboard** | `/` | Due grafici admin-only: **Nutella PPP Index** (sopra/sottovalutazione valute) e **Nutella Fatica** (minuti di lavoro per 100g). Dati verificati e inseriti manualmente. |
| **Nutella PPP** | `/ppp-index` | Calcolatore interattivo: scegli un paese, inserisci il prezzo del vasetto, il sito mostra valuta e tasso di cambio automaticamente e calcola se la valuta locale è sopra o sottovalutata rispetto all'Euro. |
| **Calcolo Istantaneo** | `/instant-calculator` | Due tab integrate: **Calcolo dal prezzo** (inserisci paese, peso, prezzo → ottieni i minuti di lavoro necessari) e **Equivalenza in Italia** (quei minuti cosa comprerebbero in Italia). Le due tab si alimentano a vicenda ma sono usabili anche separatamente. |
| **Metodologia** | `/methodology` | Spiegazione del metodo di calcolo dell'indice. |
| **Invia segnalazione** | `/submit-link` | Form pubblico per inviare rilevazioni di prezzo (con foto). I dati vanno in Firestore con status `pending` in attesa di verifica admin. |

### Schede admin (protette da login)

| Scheda | URL | Descrizione |
|---|---|---|
| **Login** | `/login` | Autenticazione Firebase. |
| **Admin** | `/admin` | Pannello per caricare dati via Excel, gestire le rilevazioni, approvare le segnalazioni pubbliche. |

---

## Architettura

- **Frontend**: Angular v19, standalone components, Tailwind CSS
- **Database**: Firebase Firestore (collezioni: `submissions`, `measurements`, `countries`, `areas`)
- **Storage**: Firebase Storage (foto caricate dagli utenti)
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
| `src/app/shared/tiers.ts` | Fasce di prezzo italiane per l'equivalenza + costanti (0.31 €/min, 2.41 min/100g) |

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
npx ng build && firebase deploy --only hosting
```

### Passo per passo

```bash
# 1. Build
npx ng build

# 2. Deploy (solo hosting)
firebase deploy --only hosting
```

Se il login Firebase è scaduto:
```bash
firebase login --reauth
```
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

## Note GDPR

- **Cookie banner**: compare al primo accesso, la scelta viene salvata in `localStorage`
- **Form segnalazioni**: include informativa art. 13 GDPR prima del tasto invio
- I dati inviati dagli utenti (prezzo, città, foto) vengono salvati su Firestore con status `pending` e non sono mai mostrati pubblicamente prima della verifica admin
