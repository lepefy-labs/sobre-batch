# sobre-batch

Cron job notturno per la generazione di contenuti personalizzati della PWA Sobre.  
Gira su **Railway** come scheduled service. Ogni notte chiama Claude Haiku per generare un `thought` mattutino e un `story`/`tip` serale per ogni utente Pro.

---

## Configurazione variabili su Railway

Nel dashboard Railway, apri il servizio `sobre-batch` → **Variables** e aggiungi:

| Variabile | Valore |
|---|---|
| `SUPABASE_URL` | URL del progetto Supabase (es. `https://xyz.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key dal dashboard Supabase → Settings → API |
| `ANTHROPIC_API_KEY` | API key Anthropic |
| `BATCH_SLOT` | `evening` (default) |

---

## Cron su Railway

Nel dashboard Railway, vai su **Settings → Cron Schedule** e imposta:

```
0 22 * * *
```

Questo corrisponde alle **23:00 CET** (UTC+1, ora solare).  
In ora legale (UTC+2, aprile–ottobre) lo script gira alle 00:00 — considera di aggiustare a `0 21 * * *` durante l'estate se vuoi mantenere le 23:00 locali.

> Railway esegue i cron in UTC. Adatta l'orario alla stagione.

---

## Run manuale su Railway

1. Apri il dashboard del servizio `sobre-batch`
2. Clicca su **Deploy** → **Trigger Deployment** (o usa il bottone "Run" se disponibile nel piano)
3. Controlla i log in tempo reale nella tab **Logs**

---

## Struttura

```
sobre-batch/
├── index.js      ← orchestrazione principale
├── supabase.js   ← client Supabase (service role)
├── generate.js   ← chiamata Claude Haiku + parsing JSON
├── prompt.js     ← costruzione prompt per tipo/lingua/mood
├── package.json
├── .env.example
└── README.md
```

## Note

- Gli errori su un singolo utente non bloccano il batch — il processo continua con il successivo.
- La domenica sera la generazione è disabilitata automaticamente.
- Se un utente ha già un contenuto generato nella giornata corrente, viene skippato.
