#!/bin/bash
# Prepara "app timmy" sulla Scrivania: cartella con etichetta rossa, avviatore
# eseguibile con un doppio clic e copia su iCloud Drive.
#
# Da lanciare una volta sola, dalla cartella del progetto:
#     bash setup-mac.sh

set -u

NOME="app timmy"
CARTELLA="$HOME/Desktop/$NOME"
AVVIATORE="$CARTELLA/Avvia $NOME.command"
ICLOUD="$HOME/Library/Mobile Documents/com~apple~CloudDocs"

# Percorso del progetto: lo ricaviamo da dove si trova questo script, così l'avviatore
# funziona anche se in futuro sposti la cartella del progetto.
PROGETTO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -f "$PROGETTO/app/main.py" ]; then
    echo "Errore: lancia questo script dalla cartella del progetto (dove c'è app/main.py)."
    exit 1
fi

echo "Progetto trovato in: $PROGETTO"

# --- 1. La cartella ---------------------------------------------------------
mkdir -p "$CARTELLA"
echo "Cartella creata: $CARTELLA"

# --- 2. L'avviatore ---------------------------------------------------------
# Estensione .command: nel Finder si apre con un doppio clic e parte nel Terminale.
cat > "$AVVIATORE" <<AVVIO
#!/bin/bash
# Avvia il downloader e apre il sito nel browser. Per fermarlo: chiudi la finestra
# del Terminale, oppure premi Control-C.

PROGETTO="$PROGETTO"
cd "\$PROGETTO" || { echo "Non trovo la cartella del progetto: \$PROGETTO"; read -r; exit 1; }

if [ ! -f .venv/bin/activate ]; then
    echo "Manca l'ambiente Python (.venv) dentro \$PROGETTO."
    echo "Crealo con:  python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    read -r -p "Premi Invio per chiudere."
    exit 1
fi

source .venv/bin/activate

# yt-dlp recente richiede Python 3.10 o superiore: senza, YouTube rifiuta le richieste.
VERSIONE=\$(python -c 'import sys; print(sys.version_info >= (3, 10))')
if [ "\$VERSIONE" != "True" ]; then
    echo "ATTENZIONE: questo ambiente usa Python \$(python -V 2>&1 | cut -d' ' -f2)."
    echo "Serve Python 3.10 o superiore, altrimenti i video non si scaricano."
    echo "Per sistemarlo, nel Terminale, una riga alla volta:"
    echo "  brew install python"
    echo "  cd \$PROGETTO"
    echo "  rm -rf .venv"
    echo "  /opt/homebrew/bin/python3 -m venv .venv"
    echo "  source .venv/bin/activate"
    echo "  pip install -r requirements.txt"
    echo
fi

# I video finiscono sulla Scrivania. Per cambiarli cartella, modifica la riga qui sotto.
export SAVE_DIR="\$HOME/Desktop"

# TikTok e Instagram richiedono un account per molti contenuti: qui diciamo a yt-dlp
# di riusare i cookie del browser in cui hai già fatto l'accesso. Dev'essere il browser
# in cui sei loggato a quei siti. Cambia in "safari" o "firefox" se usi quelli.
# Se il browser non è leggibile, l'app prosegue senza cookie invece di bloccarsi.
export COOKIES_FROM_BROWSER="chrome"

# Il generatore di PO Token, se installato con setup-potoken.sh: senza, YouTube
# consegna i metadati ma nega il file vero (errore 403).
if [ -f "\$PROGETTO/pot-provider/server/build/main.js" ]; then
    if ! nc -z 127.0.0.1 4416 >/dev/null 2>&1; then
        echo "Avvio il generatore di token..."
        ( cd "\$PROGETTO/pot-provider/server" && node build/main.js >/dev/null 2>&1 ) &
        POT_PID=\$!
        # Alla chiusura della finestra si spegne anche lui, senza restare in giro.
        trap 'kill \$POT_PID 2>/dev/null' EXIT INT TERM
        sleep 3
    fi
else
    echo "Nota: generatore di token non installato. Se YouTube da errore 403,"
    echo "lancia una volta:  bash \$PROGETTO/setup-potoken.sh"
fi

# Apre il browser dopo un attimo, il tempo che il server sia pronto.
( sleep 2; open "http://localhost:8000" ) &

echo "Downloader avviato. Chiudi questa finestra per fermarlo."
exec python -m uvicorn app.main:app --port 8000
AVVIO

chmod +x "$AVVIATORE"
echo "Avviatore creato: $(basename "$AVVIATORE")"

# --- 3. L'etichetta rossa ---------------------------------------------------
# Il Finder usa un indice numerico per i colori: 2 corrisponde al rosso.
if osascript -e "tell application \"Finder\" to set label index of (POSIX file \"$CARTELLA\" as alias) to 2" >/dev/null 2>&1; then
    echo "Etichetta rossa applicata."
else
    echo "Non sono riuscito ad applicare l'etichetta (macOS può chiedere il permesso"
    echo "per controllare il Finder). Puoi metterla a mano: clic destro sulla cartella > Rosso."
fi

# --- 4. La copia su iCloud Drive --------------------------------------------
if [ -d "$ICLOUD" ]; then
    rm -rf "$ICLOUD/$NOME"
    cp -R "$CARTELLA" "$ICLOUD/$NOME"
    echo "Copia messa su iCloud Drive: $ICLOUD/$NOME"
else
    echo "iCloud Drive non risulta attivo su questo Mac, copia saltata."
    echo "Si attiva da Impostazioni di Sistema > [il tuo nome] > iCloud > iCloud Drive."
fi

echo
echo "Fatto. Apri la Scrivania e fai doppio clic su «Avvia $NOME»."
