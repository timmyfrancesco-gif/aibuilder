# aibuilder — Video Downloader

Sito web che, dato il link di un video, lo scarica nella qualità migliore disponibile.
Funziona con YouTube, TikTok, Instagram e le centinaia di siti supportati da
[yt-dlp](https://github.com/yt-dlp/yt-dlp): l'indirizzo viene passato a yt-dlp così com'è,
quindi non c'è nulla da configurare per piattaforma.

Su TikTok yt-dlp preferisce già da sé la variante **senza watermark**, e i post che sono
sequenze di foto invece di filmati vengono riconosciuti: l'interfaccia offre solo l'audio
anziché produrre un file video vuoto.

Frontend statico + API FastAPI che pilota yt-dlp come libreria Python.

## Funzionalità

- Incolli il link e vedi subito titolo, canale, durata e anteprima
- Scelta della qualità: "migliore disponibile" oppure un'altezza specifica (1080p, 720p, …),
  con l'elenco costruito dai formati realmente offerti dal video
- Download solo audio (MP3 se ffmpeg è presente, altrimenti M4A)
- Barra di avanzamento in tempo reale con velocità e tempo rimanente
- I file scaricati vengono serviti al browser e cancellati dal server dopo un'ora

## Requisiti

- **Python 3.10 o superiore.** Non è un dettaglio: le release di yt-dlp dal 2026 richiedono
  3.10+, quindi su Python 3.9 pip installa la 2025.10.14 e YouTube la rifiuta con errori
  poco chiari («The page needs to be reloaded»). macOS di serie ha ancora 3.9:
  `brew install python` e ricrea il virtualenv.
- **ffmpeg** (consigliato). yt-dlp scarica video e audio come flussi separati e li unisce con
  ffmpeg: senza, la qualità massima è limitata ai formati già combinati (in genere 720p).
  L'interfaccia rileva l'assenza di ffmpeg e lo segnala.

L'interfaccia avvisa anche quando la yt-dlp installata ha più di tre mesi o quando Python è
troppo vecchio per aggiornarla: YouTube cambia spesso e una versione datata smette di
funzionare senza spiegazioni utili.

```bash
# macOS
brew install ffmpeg
# Debian/Ubuntu
sudo apt install ffmpeg
```

## Avvio

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Apri http://localhost:8000

## Dove finisce il file

Su computer il download parte come qualsiasi altro: il file va nella cartella **Download**
(`/api/file` risponde con `Content-Disposition: attachment`).

## Dal telefono

Avvia il server in ascolto sulla rete locale e apri l'indirizzo del computer dal telefono:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
ipconfig getifaddr en0     # su macOS: l'indirizzo da usare, es. 192.168.1.42
```

Poi apri `http://192.168.1.42:8000` dal telefono. Attenzione: così l'app è raggiungibile da
chiunque sia sulla stessa rete e non ha autenticazione.

**Per salvare nelle Foto** l'app mostra un pulsante «Salva nelle Foto» che apre il menu di
condivisione del sistema, dove si sceglie *Salva video*. Una pagina web non può scrivere
nel rullino da sola: questo menu è l'unica strada, e il browser lo espone solo in **contesto
sicuro** (https o localhost). Aperta via `http://192.168.x.x` la funzione non esiste, quindi
l'app se ne accorge e spiega il percorso alternativo: il file va nell'app **File**, da lì lo
si apre, si tocca condividi e si sceglie *Salva video*.

Per avere il pulsante diretto serve https, per esempio con un tunnel (`cloudflared tunnel
--url http://localhost:8000`) che fornisce un indirizzo https temporaneo.

## Metterlo online (per usarlo dal telefono senza tenere acceso il computer)

Il repository contiene un `Dockerfile` (con ffmpeg già dentro) e un `render.yaml` pronto per
[Render](https://render.com), ma l'immagine funziona su qualunque servizio che accetti Docker.

1. Su Render: **New → Blueprint**, scegli questo repository.
2. Al deploy viene chiesta **APP_PASSWORD**: è la password che protegge il sito. Non lasciarla
   vuota — senza, chiunque abbia l'indirizzo può usare il tuo server.
3. Apri l'indirizzo assegnato dal telefono e inserisci la password quando il browser la chiede.

Essendo su https, dal telefono compare anche il pulsante **Salva nelle Foto**.

### Limiti da conoscere

- **YouTube spesso rifiuta le richieste dai datacenter.** È il motivo per cui yt-dlp include
  un sottosistema apposta (`pot/`, PO Token). Da un IP domestico si passa quasi sempre, da un
  server in affitto no. Rimedio: esporta i cookie del tuo browser in formato Netscape e
  incollali nella variabile `YTDLP_COOKIES` — le richieste partiranno come da utente
  registrato. TikTok e la maggior parte degli altri siti non hanno questo problema.
- **I piani gratuiti si addormentano** dopo qualche minuto di inattività: la prima richiesta
  dopo una pausa può metterci un minuto.
- **Il disco è poco e temporaneo.** `MAX_DISK_MB` (default 2048) elimina automaticamente i
  download conclusi più vecchi quando lo spazio supera la soglia, e `JOB_TTL_MINUTES`
  controlla dopo quanto un file scade. I download in corso non vengono mai toccati.
- Scarica solo ciò che ti è consentito scaricare, e verifica che le condizioni del servizio
  di hosting che scegli permettano questo tipo di applicazione.

### Variabili d'ambiente

| Variabile           | Effetto                                                          |
|---------------------|------------------------------------------------------------------|
| `APP_PASSWORD`      | Protegge il sito. Se vuota, nessuna password (solo per uso locale) |
| `YTDLP_COOKIES`     | Cookie in formato Netscape, per superare i blocchi di YouTube      |
| `MAX_DISK_MB`       | Spazio massimo occupato dai download conclusi (default 2048)        |
| `JOB_TTL_MINUTES`   | Dopo quanto un file scaricato viene eliminato (default 60)          |
| `PORT`              | Porta di ascolto, assegnata dal servizio di hosting                 |

## Struttura

```
app/
  main.py            API FastAPI (info, download, progresso, file)
  downloader.py      wrapper yt-dlp: metadati, job in background, progresso
  static/            interfaccia (HTML/CSS/JS senza dipendenze)
downloads/           file temporanei, uno per job (in .gitignore)
```

## API

| Metodo | Endpoint              | Descrizione                                                       |
|--------|-----------------------|-------------------------------------------------------------------|
| GET    | `/api/config`         | Indica se ffmpeg è disponibile                                     |
| POST   | `/api/info`           | Metadati e qualità disponibili (nessun download)                   |
| POST   | `/api/download`       | Avvia un job, restituisce l'`id`                                   |
| GET    | `/api/progress/{id}`  | Stato: `queued`/`downloading`/`processing`/`done`/`error`           |
| GET    | `/api/file/{id}`      | Scarica il file prodotto                                           |

## Note

- L'app è pensata per uso locale/personale: non ha autenticazione né limiti di richieste,
  quindi non esporla su internet senza aggiungerli.
- yt-dlp non viene invocato tramite shell (è importato come libreria) e gli URL sono
  validati prima dell'uso.
- YouTube può richiedere una verifica anti-bot su alcune reti: in quel caso serve configurare
  i cookie di yt-dlp.
- Scarica solo contenuti di cui detieni i diritti o il cui download è consentito dai termini
  di servizio della piattaforma.
