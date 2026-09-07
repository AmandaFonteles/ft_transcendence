# Image nginx : nginx officiel, un certificat auto-signe et notre configuration.

# Nom pleinement qualifie : sous Podman, un nom court declencherait une question
# interactive sur le registre a utiliser.
FROM docker.io/library/nginx:1.27-alpine

RUN apk add --no-cache openssl

# Certificat genere au build : "make up" n'a besoin d'aucune etape manuelle.
# -x509 : auto-signe, donc le navigateur previendra — normal en local.
# -nodes : cle sans phrase de passe, nginx demarre sans interaction.
# -subj : remplit l'identite sans prompt interactif.
RUN mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/certs/key.pem \
      -out    /etc/nginx/certs/cert.pem \
      -subj "/C=FR/ST=NA/L=Talence/O=42/CN=localhost"

# Remplace la config par defaut, qui sert une page statique, par notre reverse proxy.
COPY nginx.conf /etc/nginx/nginx.conf

# Identifiants de la Basic Auth des UI de monitoring : un hash bcrypt, jamais un
# mot de passe en clair.
COPY .htpasswd /etc/nginx/.htpasswd

# Purement informatif : la publication reelle des ports se fait dans docker-compose.
EXPOSE 80 443

# Pas de CMD : l'image de base lance deja nginx en avant-plan (daemon off).
