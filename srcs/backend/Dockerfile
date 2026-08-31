# =============================================================================
# Image backend : Node + NestJS + Prisma, lancee en mode DEV.
# =============================================================================

# Part de l'image officielle Node 22 alpine (legere).
# Nom pleinement qualifie : sous Podman, un nom court declencherait une question
# interactive sur le registre a utiliser, ce qui casserait le "une seule commande".
FROM docker.io/library/node:22-alpine

# Installe openssl via le gestionnaire de paquets d'Alpine.
# Pourquoi : le moteur de requetes de Prisma depend d'openssl ; sans lui, on obtient
# une erreur "Unable to require libquery_engine" au demarrage sur une image alpine.
RUN apk add --no-cache openssl

# Installe openssl via le gestionnaire de paquets d'Alpine.
# Pourquoi : le moteur de requetes de Prisma depend d'openssl ; sans lui, on obtient
# une erreur "Unable to require libquery_engine" au demarrage sur une image alpine.
RUN apk add --no-cache openssl

# Dossier de travail dans le conteneur.
WORKDIR /app

# Copie d'abord les manifestes pour profiter du cache de couches.
COPY package*.json ./

# Installe les dependances (Nest + Prisma CLI + @prisma/client).
RUN npm install

# Copie le reste du code (dont prisma/schema.prisma et l'entrypoint).
COPY . .

# Documente le port de l'API (interne ; nginx le proxifie).
EXPOSE 3000

# Point d'entree du conteneur : notre script de demarrage
# (prisma generate + prisma db push + lancement de NestJS).
# Pourquoi "sh script" et pas "./script" : evite de dependre du bit d'execution du fichier
# (il peut se perdre selon l'OS hote) ; sh le lance quoi qu'il arrive.
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
