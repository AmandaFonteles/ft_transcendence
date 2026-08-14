# =============================================================================
# Image backend : Node + NestJS, lancee en mode DEV (watch = redemarrage a chaque save).
# =============================================================================

# Part de l'image officielle Node 22 alpine (legere).
FROM node:22-alpine

# Dossier de travail dans le conteneur.
WORKDIR /app

# Copie d'abord les manifestes pour profiter du cache de couches (voir frontend).
COPY package*.json ./

# Installe les dependances NestJS.
RUN npm install

# Copie le reste du code (recouvert par le bind mount a l'execution).
COPY . .

# Documente le port de l'API (interne ; nginx le proxifie).
EXPOSE 3000

# Demarre Nest en mode watch : il recompile et redemarre a chaque changement de fichier.
CMD ["npm", "run", "start:dev"]
