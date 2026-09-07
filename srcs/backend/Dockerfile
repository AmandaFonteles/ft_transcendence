# Image backend : Node + NestJS + Prisma, lancee en mode dev.

# Nom pleinement qualifie : sous Podman, un nom court declencherait une question
# interactive sur le registre a utiliser.
FROM docker.io/library/node:22-alpine

# Le moteur de requetes de Prisma depend d'openssl ; sans lui, une image alpine
# echoue au demarrage sur "Unable to require libquery_engine".
RUN apk add --no-cache openssl

WORKDIR /app

# Les manifestes d'abord : tant qu'ils ne changent pas, Docker reutilise le cache
# du "npm ci" meme quand le code change.
COPY package*.json ./

# "ci" et non "install" : "install" traite le lockfile comme une suggestion et
# peut le reecrire, "ci" le traite comme une loi et echoue si le lock diverge de
# package.json. Le build casse tot plutot que de produire un arbre different de
# celui des coequipiers.
RUN npm ci

COPY . .

# Port de l'API, interne au reseau Docker : nginx le proxifie.
EXPOSE 3000

# "sh script" et non "./script" : ne depend pas du bit d'execution du fichier,
# qui peut se perdre selon l'OS hote.
ENTRYPOINT ["sh", "docker-entrypoint.sh"]
