# ffmpeg deve essere nell'immagine: senza, la qualità si ferma ai formati già combinati.
FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /srv

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

# I download sono file temporanei: restano nel filesystem del contenitore e spariscono
# a ogni riavvio, il che va benissimo.
RUN mkdir -p downloads && useradd --create-home app && chown -R app:app /srv
USER app

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

# Le piattaforme di hosting assegnano la porta tramite la variabile PORT.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]
