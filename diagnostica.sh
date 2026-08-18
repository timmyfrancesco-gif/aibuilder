#!/bin/bash
# Raccoglie le informazioni utili a capire perche YouTube nega il file.
# Stampa un riepilogo corto da incollare; il registro completo resta in diagnostica.log.
#
#     bash diagnostica.sh
#     bash diagnostica.sh "https://youtu.be/ALTRO_VIDEO"

set -u

PROGETTO="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROGETTO" || exit 1
VIDEO="${1:-https://youtu.be/uPikQxXmHtg}"
CONTROLLO="https://www.youtube.com/watch?v=jNQXAC9IVRw"
LOG="$PROGETTO/diagnostica.log"
: > "$LOG"

if [ ! -f .venv/bin/activate ]; then
    echo "Manca .venv: lancia prima l'avviatore almeno una volta."
    exit 1
fi
source .venv/bin/activate

echo "===================== AMBIENTE ====================="
printf "  python      : %s\n" "$(python -V 2>&1)"
printf "  yt-dlp      : %s\n" "$(python -m yt_dlp --version 2>&1 | tail -1)"
printf "  ffmpeg      : %s\n" "$(ffmpeg -version 2>/dev/null | head -1 | cut -d' ' -f1-3)"
printf "  node        : %s\n" "$(node -v 2>/dev/null || echo assente)"
printf "  deno        : %s\n" "$(deno --version 2>/dev/null | head -1 || echo assente)"

if nc -z 127.0.0.1 4416 >/dev/null 2>&1; then
    echo "  generatore  : in ascolto sulla porta 4416"
else
    echo "  generatore  : NON in ascolto"
fi

echo -n "  plugin PO   : "
python -c "
try:
    from importlib.metadata import version
    print(version('bgutil-ytdlp-pot-provider'))
except Exception:
    print('non installato')
" 2>/dev/null

echo
echo "============== IL VIDEO CHE NON VA =================="
echo "  $VIDEO"
python -m yt_dlp -v --no-warnings --simulate "$VIDEO" >> "$LOG" 2>&1
ESITO_INFO=$?
echo "  lettura informazioni: $([ $ESITO_INFO -eq 0 ] && echo OK || echo FALLITA)"

# Il formato piu leggero che esista: se il flusso viene negato, il 403 arriva subito.
# "worst" da solo non basta: fallisce quando video e audio sono separati.
python -m yt_dlp -v --no-warnings -f "worstvideo*+worstaudio/worst/best" \
    -o "/tmp/prova_diag.%(ext)s" --force-overwrites "$VIDEO" >> "$LOG" 2>&1
ESITO_DL=$?
echo "  scaricamento file  : $([ $ESITO_DL -eq 0 ] && echo OK || echo FALLITO)"
rm -f /tmp/prova_diag.* 2>/dev/null

echo
echo "=========== UN VIDEO DI CONTROLLO (pubblico) ========"
python -m yt_dlp -v --no-warnings -f "worstvideo*+worstaudio/worst/best" \
    -o "/tmp/prova_ctrl.%(ext)s" --force-overwrites "$CONTROLLO" >> "$LOG" 2>&1
ESITO_CTRL=$?
echo "  scaricamento       : $([ $ESITO_CTRL -eq 0 ] && echo OK || echo FALLITO)"
rm -f /tmp/prova_ctrl.* 2>/dev/null

echo
echo "============== RIGHE SIGNIFICATIVE ================="
grep -iE "po.?token|potoken|bgutil|jsi|javascript|deno|nsig|n-sig|ejs|player.?client|sabr|drm|403|forbidden|throttl" "$LOG" \
  | sed 's/^/  /' | sort -u | head -30

echo
echo "===================== VERDETTO ====================="
if [ $ESITO_CTRL -eq 0 ] && [ $ESITO_DL -ne 0 ]; then
    echo "  YouTube funziona: il blocco riguarda SOLO quel video."
elif [ $ESITO_CTRL -ne 0 ] && [ $ESITO_DL -ne 0 ]; then
    echo "  Bloccati entrambi: il problema e nella configurazione, non nel video."
elif [ $ESITO_DL -eq 0 ]; then
    echo "  Il video si scarica: il problema era transitorio o gia risolto."
fi
echo
echo "  Registro completo: $LOG"
echo "  Incolla qui sopra dal titolo AMBIENTE in giu."
