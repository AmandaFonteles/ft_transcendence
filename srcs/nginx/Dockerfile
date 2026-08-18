# =============================================================================
# Image nginx : nginx officiel + un certificat auto-signe + notre configuration.
# Un Dockerfile est une recette : chaque instruction ajoute une "couche" a l'image.
# =============================================================================

# Part de l'image officielle nginx, variante alpine (Linux minimal, image legere).
# Pourquoi alpine : demarrage rapide et petite taille d'image.
FROM nginx:1.27-alpine

# Installe openssl via le gestionnaire de paquets d'Alpine (apk).
# Pourquoi : on en a besoin pour GENERER un certificat TLS dans l'image.
# --no-cache : n'ecrit pas l'index des paquets sur le disque (garde l'image petite).
RUN apk add --no-cache openssl

# Cree le dossier des certificats puis genere une paire cle privee + certificat.
# Pourquoi au BUILD : "make up" n'a besoin d'aucune etape manuelle de certificat.
# -x509 : certificat auto-signe (pas d'autorite externe) -> le navigateur previendra, c'est normal en local.
# -nodes : cle sans phrase de passe -> nginx peut demarrer sans interaction.
# -days 365 : validite d'un an, suffisant pour le developpement.
# -newkey rsa:2048 : genere une nouvelle cle RSA 2048 bits.
# -subj : remplit l'identite du certificat sans prompt interactif (CN=localhost).
RUN mkdir -p /etc/nginx/certs && \
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
      -keyout /etc/nginx/certs/key.pem \
      -out    /etc/nginx/certs/cert.pem \
      -subj "/C=FR/ST=NA/L=Talence/O=42/CN=localhost"

# Remplace la configuration nginx par defaut par la notre (reverse proxy + TLS).
# Pourquoi : la config par defaut sert une page statique ; nous voulons proxifier.
COPY nginx.conf /etc/nginx/nginx.conf

# Documente les ports servis par le conteneur (purement informatif).
# Pourquoi : n'ouvre rien tout seul ; la publication reelle se fait dans docker-compose.
EXPOSE 80 443

# Pas de CMD : l'image de base lance deja nginx en avant-plan (daemon off),
# ce qui maintient le conteneur en vie. Pourquoi ne pas le reecrire : inutile.
