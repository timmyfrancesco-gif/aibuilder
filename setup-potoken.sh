#!/bin/bash
# Installa il generatore di PO Token, il componente che permette a yt-dlp di ottenere
# da YouTube il file vero e non solo i metadati (l'errore "HTTP Error 403").
#
#     bash setup-potoken.sh
#
# Va lanciato una volta sola. Dopo, l'avviatore lo accende da se.

set -u

PROGETTO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROGETTO" || exit 1

if [ ! -f app/main.py ]; then
    echo "Errore: lancia questo script dalla cartella del progetto."
    exit 1
fi

# --- Node --------------------------------------------------------------------
if ! command -v node >/dev/null 2>&1; then
    echo "Node non e installato. Lo installo con Homebrew..."
    if ! command -v brew >/dev/null 2>&1; then
        echo "Serve Homebrew. Installalo da https://brew.sh e rilancia questo script."
        exit 1
    fi
    brew install node || exit 1
fi

VERSIONE_NODE="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "$VERSIONE_NODE" -lt 20 ]; then
    echo "Serve Node 20 o superiore (trovato $VERSIONE_NODE). Aggiornalo con: brew upgrade node"
    exit 1
fi
echo "Node $(node -v) trovato."

# --- Plugin per yt-dlp -------------------------------------------------------
if [ ! -f .venv/bin/activate ]; then
    echo "Manca l'ambiente Python (.venv). Crealo prima con:"
    echo "  python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    exit 1
fi
source .venv/bin/activate
python -m pip install -U bgutil-ytdlp-pot-provider || exit 1

# La versione del server deve combaciare con quella del plugin, altrimenti non si parlano.
VERSIONE_PLUGIN="$(python -c "
try:
    from importlib.metadata import version
    print(version('bgutil-ytdlp-pot-provider'))
except Exception:
    print('')
" 2>/dev/null)"
echo "Plugin installato: ${VERSIONE_PLUGIN:-sconosciuto}"

# --- Server che genera i token -----------------------------------------------
if [ -d pot-provider/.git ]; then
    echo "Aggiorno il generatore gia presente..."
    git -C pot-provider fetch --tags --quiet || true
else
    rm -rf pot-provider
    git clone --quiet https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git pot-provider || exit 1
fi

if [ -n "$VERSIONE_PLUGIN" ] && git -C pot-provider rev-parse "$VERSIONE_PLUGIN" >/dev/null 2>&1; then
    git -C pot-provider checkout --quiet "$VERSIONE_PLUGIN"
    echo "Server allineato alla versione $VERSIONE_PLUGIN."
else
    echo "Nessun tag corrispondente: uso il ramo principale."
fi

cd pot-provider/server || exit 1
echo "Compilo il generatore (puo richiedere qualche minuto)..."
npm ci --silent || exit 1
npx tsc || exit 1
cd "$PROGETTO" || exit 1

echo
echo "Fatto. Rilancia «bash setup-mac.sh» per aggiornare l'avviatore,"
echo "poi fai doppio clic su «Avvia app timmy»: il generatore parte da solo."
