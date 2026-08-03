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
const progressBox = $("progress-box");
const barFill = $("bar-fill");
const progressLabel = $("progress-label");
const progressPct = $("progress-pct");
const saveLink = $("save");

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
  try {
    const cfg = await (await fetch("/api/config")).json();
    hasFfmpeg = cfg.ffmpeg;
  } catch {
    /* se la config non risponde restiamo sui default */
  }
  ffmpegNote.hidden = hasFfmpeg;
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
  qualityField.hidden = modeSel.value === "audio";

  progressBox.hidden = true;
  saveLink.hidden = true;
  barFill.style.width = "0%";
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
  saveLink.hidden = true;
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
        saveLink.href = `/api/file/${jobId}`;
        saveLink.textContent = `Salva ${job.filename} (${dimensione(job.filesize)})`;
        saveLink.hidden = false;
        sbloccaBottoni();
        return;
      }
      if (job.status === "error") {
        mostraErrore(job.error || "Download non riuscito.");
        progressBox.hidden = true;
        sbloccaBottoni();
        return;
      }
      polling = setTimeout(tick, 800);
    } catch (err) {
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
