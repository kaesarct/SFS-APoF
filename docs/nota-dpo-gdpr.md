# Nota per il DPO: punti GDPR aperti sul sito "Indice Nutella"

Data: 23/11/2026 · Classificazione: Interno · Sito: https://lgrdg-a4a32.web.app (Firebase, piano gratuito Spark)

Questa nota riassume i punti emersi dall'audit tecnico che richiedono una valutazione e una decisione del DPO.
Nessuna delle modifiche descritte qui sotto è stata applicata al sito: restano in attesa di indicazioni.

## 1. Esposizione passata delle segnalazioni (da valutare come possibile violazione)

- **Cosa è successo:** fino al 23/11/2026 le regole di Firestore consentivano a chiunque di leggere la collezione `submissions`, cioè le segnalazioni inviate tramite il form pubblico.
- **Dati coinvolti:** Paese, città, prezzo, peso, data e ora di invio, e un nome utente facoltativo scritto liberamente da chi invia. Non vengono raccolti né email, né indirizzo IP, né foto.
- **Stato attuale:** il 23/11/2026 le regole sono state corrette. La lettura delle segnalazioni ora è riservata a due account amministratori, e una richiesta anonima riceve una risposta 403 (verificato).
- **Cosa non sappiamo:**
  - da quando le regole erano aperte;
  - se qualcuno abbia effettivamente letto i dati: sul piano gratuito non sono attivi i log di accesso ai dati.

**Decisione richiesta:** valutare se si tratti di una violazione da registrare (art. 33, par. 5) e se servano notifiche, considerando che il nome utente è un campo libero e potrebbe contenere nomi reali.

## 2. Banner cookie non coerente con il funzionamento reale

- **Testo che non corrisponde al sito:** il banner parla di "cookie analitici anonimi", ma il sito non usa alcuno strumento di analytics.
- **reCAPTCHA v3 senza consenso:** il sito usa reCAPTCHA v3 di Google (attraverso Firebase App Check) per proteggere il form dagli invii automatici. reCAPTCHA viene caricato su tutte le pagine, prima e indipendentemente dalla scelta dell'utente, e imposta cookie di terze parti (`_GRECAPTCHA`).
- **"Solo necessari" non ha effetto:** il pulsante salva la scelta ma non cambia il comportamento del sito.
- **Privacy Policy mancante:** il link nel banner non porta a nessuna pagina.

**Decisioni richieste:**
1. Base giuridica di reCAPTCHA:
   - **opzione (a):** legittimo interesse per la sicurezza del form, con informativa;
   - **opzione (b):** consenso. In questo caso reCAPTCHA si caricherebbe solo dopo il consenso, e solo nella pagina del form.
2. Il nuovo testo del banner, coerente con la scelta.
3. Il testo della Privacy Policy da pubblicare (art. 13), che oggi manca.

L'opzione (b) è tecnicamente fattibile senza costi.

## 3. Conservazione e cancellazione

- **Nessun termine di conservazione:**
  - le segnalazioni rifiutate vengono cancellate;
  - quelle approvate restano nella collezione `submissions` a tempo indeterminato, con stato `approved`.
- **Dati pubblicati:** all'approvazione, il nome utente e la città vengono copiati nella collezione `measurements`, che è pubblica.
- **Nessuna procedura documentata** per rispondere alle richieste di cancellazione (art. 17).

**Decisioni richieste:**
- per quanto tempo conservare le segnalazioni;
- se il nome utente debba essere pubblicato o pseudonimizzato;
- quale procedura adottare per le richieste degli interessati.

## 4. Altro da verificare

- **DPIA:** valutare se sia necessaria. Il trattamento sembra a basso rischio, ma l'uso di un fornitore extra-UE (Google reCAPTCHA) va considerato.
- **Registro dei trattamenti:** verificare che contenga la voce relativa a questo sito.
- **Trasferimenti extra-UE:** il database è nella regione `europe-west12` (Torino); reCAPTCHA invece è un servizio Google globale.

## Riferimenti tecnici

- **Regole di accesso:** `firestore.rules`.
- **Form e consenso:** `src/app/link-submission/`.
- **Banner cookie:** `src/app/app.html` e `src/app/app.ts`.
- **Caricamento di reCAPTCHA e App Check:** `src/app/app.config.ts`.

Le conversazioni e i documenti di audit possono costituire evidenza per l'SGSI, ma non sostituiscono le approvazioni formali.
Questa nota va validata dal DPO o dal Responsabile SGSI.
