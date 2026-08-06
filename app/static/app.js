const $ = (id) => document.getElementById(id);

const form = $("form");
const urlInput = $("url");
const analyzeBtn = $("analyze");
const alertBox = $("alert");
const card = $("card");
const thumb = $("thumb");
const titleEl = $("title");
const channelEl = $("channel");
const statsEl = $("stats");
const modeSel = $("mode");
const qualitySel = $("quality");
const qualityField = $("quality-field");
const startBtn = $("start");
const ffmpegNote = $("ffmpeg-note");
const ytdlpNote = $("ytdlp-note");
const audioNote = $("audio-note");
const progressBox = $("progress-box");
const barFill = $("bar-fill");
const progressLabel = $("progress-label");
const progressPct = $("progress-pct");
const saveLink = $("save");
const shareBtn = $("share");
const destNote = $("dest-note");

let corrente = null;   // metadati del video analizzato
let polling = null;    // handle del setTimeout di polling
let hasFfmpeg = true;

const ETICHETTE = {
  queued: "In coda…",
  downloading: "Download in corso",
  processing: "Elaborazione…",
  done: "Completato",
  error: "Errore",
};

// Per la qualità massima video e audio arrivano come due download separati: senza dirlo,
// la barra sembra ripartire da capo senza motivo.
const FLUSSI = {
  video: "Download del video",
  audio: "Download dell'audio",
};

init();

async function init() {
  let cfg = null;
  try {
    cfg = await (await fetch("/api/config")).json();
    hasFfmpeg = cfg.ffmpeg;
  } catch {
    /* se la config non risponde restiamo sui default */
  }
  ffmpegNote.hidden = hasFfmpeg;
  if (cfg) avvisaAmbiente(cfg);
  riprendiJob();
}

// YouTube cambia spesso: una yt-dlp vecchia fallisce con errori che non dicono nulla.
// Meglio segnalarlo subito che lasciare l'utente a indovinare.
function avvisaAmbiente(cfg) {
  const mesi = Math.round((cfg.ytdlp_age_days || 0) / 30);
  if (!cfg.python_ok) {
    ytdlpNote.textContent =
      `Stai usando Python ${cfg.python_version}: da 3.10 in poi si possono installare le ` +
      `versioni recenti di yt-dlp. Ora sei fermo alla ${cfg.ytdlp_version}` +
      (mesi ? ` (${mesi} mesi fa)` : "") +
      ", che YouTube potrebbe già rifiutare.";
    ytdlpNote.hidden = false;
  } else if (cfg.ytdlp_stale) {
    ytdlpNote.textContent =
      `yt-dlp ${cfg.ytdlp_version} è di circa ${mesi} mesi fa. Se un video non parte, ` +
      "aggiornala con «pip install -U yt-dlp».";
    ytdlpNote.hidden = false;
  }
}

// Se la pagina viene ricaricata durante un download, il job continua sul server:
// senza questo si perderebbe il file e si ripartirebbe da capo.
function riprendiJob() {
  const salvato = sessionStorage.getItem("job");
  if (!salvato) return;
  fetch(`/api/progress/${salvato}`)
    .then((r) => (r.ok ? r.json() : null))
    .then((job) => {
      if (!job || job.status === "error") {
        sessionStorage.removeItem("job");
        return;
      }
      card.hidden = false;
      progressBox.hidden = false;
      aggiornaProgresso(job);
      seguiJob(salvato);
    })
    .catch(() => sessionStorage.removeItem("job"));
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  await analizza(urlInput.value.trim());
});

modeSel.addEventListener("change", () => {
  qualityField.hidden = modeSel.value === "audio";
});

startBtn.addEventListener("click", avviaDownload);

async function analizza(url) {
  if (!url) return;

  fermaPolling();
  mostraErrore(null);
  card.hidden = true;
  bloccaUI(true, "Analisi…");

  try {
    const res = await fetch("/api/info", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const dati = await res.json();
    if (!res.ok) throw new Error(dettaglio(dati));

    corrente = dati;
    riempiCard(dati);
    card.hidden = false;
  } catch (err) {
    mostraErrore(err.message);
  } finally {
    bloccaUI(false, "Analizza");
  }
}

function riempiCard(info) {
  thumb.src = info.thumbnail || "";
  thumb.alt = info.title ? `Anteprima di ${info.title}` : "";
  titleEl.textContent = info.title || "Senza titolo";
  channelEl.textContent = info.uploader || info.extractor || "";

  const pezzi = [];
  if (info.duration) pezzi.push(durata(info.duration));
  if (info.view_count) pezzi.push(`${info.view_count.toLocaleString("it-IT")} visualizzazioni`);
  statsEl.textContent = pezzi.join(" · ");

  riempiQualita(info.heights || []);
  soloAudio(info.has_video === false);
  qualityField.hidden = modeSel.value === "audio";

  progressBox.hidden = true;
  nascondiSalva();
  barFill.style.width = "0%";
}

// Post senza filmato (le slideshow di TikTok): offrire "Video" produrrebbe solo un file
// audio con l'estensione sbagliata, quindi la scelta si blocca sull'audio.
function soloAudio(forza) {
  const opzioneVideo = modeSel.querySelector('option[value="video"]');
  opzioneVideo.disabled = forza;
  modeSel.disabled = forza;
  if (forza) modeSel.value = "audio";
  audioNote.hidden = !forza;
}

function riempiQualita(altezze) {
  qualitySel.innerHTML = "";

  const migliore = document.createElement("option");
  migliore.value = "best";
  migliore.textContent = hasFfmpeg ? "Migliore disponibile" : "Migliore (file singolo)";
  qualitySel.appendChild(migliore);

  for (const h of altezze) {
    const opt = document.createElement("option");
    opt.value = String(h);
    opt.textContent = `${h}p`;
    qualitySel.appendChild(opt);
  }
}

async function avviaDownload() {
  if (!corrente) return;

  fermaPolling();
  mostraErrore(null);
  nascondiSalva();
  progressBox.hidden = false;
  aggiornaProgresso({ status: "queued", progress: 0 });
  startBtn.disabled = true;
  analyzeBtn.disabled = true;

  try {
    const res = await fetch("/api/download", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: corrente.webpage_url,
        mode: modeSel.value,
        quality: modeSel.value === "audio" ? "best" : qualitySel.value,
      }),
    });
    const job = await res.json();
    if (!res.ok) throw new Error(dettaglio(job));

    sessionStorage.setItem("job", job.id);
    seguiJob(job.id);
  } catch (err) {
    mostraErrore(err.message);
    progressBox.hidden = true;
    sbloccaBottoni();
  }
}

function seguiJob(jobId) {
  const tick = async () => {
    try {
      const res = await fetch(`/api/progress/${jobId}`);
      const job = await res.json();
      if (!res.ok) throw new Error(dettaglio(job));

      aggiornaProgresso(job);

      if (job.status === "done") {
        sessionStorage.removeItem("job");
        preparaSalvataggio(job, jobId);
        sbloccaBottoni();
        return;
      }
      if (job.status === "error") {
        sessionStorage.removeItem("job");
        mostraErrore(job.error || "Download non riuscito.");
        progressBox.hidden = true;
        sbloccaBottoni();
        return;
      }
      polling = setTimeout(tick, 800);
    } catch (err) {
      sessionStorage.removeItem("job");
      mostraErrore(err.message);
      progressBox.hidden = true;
      sbloccaBottoni();
    }
  };
  tick();
}

function aggiornaProgresso(job) {
  const pct = job.progress || 0;
  barFill.style.width = `${pct}%`;
  progressPct.textContent = `${Math.round(pct)}%`;

  let testo = ETICHETTE[job.status] || job.status;
  if (job.status === "downloading") {
    testo = FLUSSI[job.stream] || ETICHETTE.downloading;
    const extra = [job.speed, job.eta && `${job.eta} rimanenti`].filter(Boolean).join(" · ");
    if (extra) testo += ` — ${extra}`;
  } else if (job.status === "processing" && job.step) {
    testo = `${job.step.charAt(0).toUpperCase()}${job.step.slice(1)}…`;
  }
  progressLabel.textContent = testo;
}

// Il tipo MIME giusto è ciò che fa comparire "Salva video" nel menu di condivisione di
// iOS: con application/octet-stream il sistema non capisce che è un filmato.
const TIPI = {
  mp4: "video/mp4",
  mkv: "video/x-matroska",
  webm: "video/webm",
  mov: "video/quicktime",
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
};

// Condividere significa tenere l'intero file in memoria: su un telefono, oltre una certa
// dimensione la scheda va in crash. Meglio non offrire l'opzione che farla fallire.
const LIMITE_CONDIVISIONE = 400 * 1024 * 1024;

const IOS =
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

function tipoDi(nome) {
  return TIPI[(nome || "").split(".").pop().toLowerCase()] || "application/octet-stream";
}

function preparaSalvataggio(job, jobId) {
  const url = `/api/file/${jobId}`;
  const tipo = tipoDi(job.filename);

  saveLink.href = url;
  saveLink.textContent = `Salva ${job.filename} (${dimensione(job.filesize)})`;
  saveLink.hidden = false;

  // navigator.share con i file esiste solo in contesto sicuro (https o localhost):
  // aperto dal telefono via http://192.168.x.x non c'è, e la prova qui sotto lo rileva.
  let condivisibile = false;
  try {
    condivisibile =
      typeof navigator.canShare === "function" &&
      job.filesize <= LIMITE_CONDIVISIONE &&
      navigator.canShare({ files: [new File([], job.filename, { type: tipo })] });
  } catch {
    condivisibile = false;
  }

  shareBtn.hidden = !condivisibile;
  if (condivisibile) {
    shareBtn.textContent = IOS ? "Salva nelle Foto" : "Condividi…";
    shareBtn.onclick = () => condividi(url, job.filename, tipo);
  }

  destNote.innerHTML = testoDestinazione(condivisibile);
  destNote.hidden = false;
}

function testoDestinazione(condivisibile) {
  if (condivisibile && IOS) {
    return "«Salva nelle Foto» apre il menu di iOS: scegli <b>Salva video</b>.<br>«Salva» mette il file nell'app File.";
  }
  if (IOS) {
    return (
      "Il file finisce nell'app <b>File</b>. Per averlo nelle Foto: aprilo, tocca " +
      "l'icona di condivisione e scegli <b>Salva video</b>.<br>" +
      "Il pulsante diretto compare solo se apri il sito in https."
    );
  }
  return "Il file viene salvato nella cartella <b>Download</b>.";
}

async function condividi(url, nome, tipo) {
  const etichetta = shareBtn.textContent;
  shareBtn.disabled = true;
  shareBtn.textContent = "Preparazione…";
  try {
    const blob = await (await fetch(url)).blob();
    await navigator.share({ files: [new File([blob], nome, { type: tipo })] });
  } catch (err) {
    // L'utente che chiude il menu non è un errore da segnalare.
    if (err && err.name !== "AbortError") {
      mostraErrore("Condivisione non riuscita: usa «Salva» qui sopra.");
    }
  } finally {
    shareBtn.disabled = false;
    shareBtn.textContent = etichetta;
  }
}

// Via anche l'href: nasconderlo e basta lascerebbe un collegamento al download precedente.
function nascondiSalva() {
  saveLink.hidden = true;
  saveLink.removeAttribute("href");
  shareBtn.hidden = true;
  shareBtn.onclick = null;
  destNote.hidden = true;
}

function fermaPolling() {
  if (polling) clearTimeout(polling);
  polling = null;
}

function bloccaUI(attivo, etichetta) {
  analyzeBtn.disabled = attivo;
  analyzeBtn.textContent = etichetta;
}

function sbloccaBottoni() {
  startBtn.disabled = false;
  analyzeBtn.disabled = false;
}

function mostraErrore(messaggio) {
  alertBox.hidden = !messaggio;
  alertBox.textContent = messaggio || "";
}

function dettaglio(payload) {
  const d = payload?.detail;
  if (typeof d === "string") return d;
  if (Array.isArray(d) && d[0]?.msg) return d[0].msg.replace("Value error, ", "");
  return "Richiesta non riuscita.";
}

function durata(secondi) {
  const h = Math.floor(secondi / 3600);
  const m = Math.floor((secondi % 3600) / 60);
  const s = Math.floor(secondi % 60);
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function dimensione(byte) {
  if (!byte) return "";
  const unita = ["B", "KB", "MB", "GB"];
  let i = 0;
  let n = byte;
  while (n >= 1024 && i < unita.length - 1) {
    n /= 1024;
    i += 1;
  }
  return `${n.toFixed(1)} ${unita[i]}`;
}
