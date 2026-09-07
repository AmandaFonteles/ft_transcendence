# Image frontend : Node + l'app React/Vite, lancee en mode dev (hot reload).

# Nom pleinement qualifie : sous Podman, un nom court declencherait une question
# interactive sur le registre a utiliser.
FROM docker.io/library/node:22-alpine

WORKDIR /app

# Les manifestes d'abord : tant qu'ils ne changent pas, Docker reutilise le cache
# du "npm ci" meme quand le code change.
COPY package*.json ./

# "ci" et non "install" : "install" traite le lockfile comme une suggestion et
# peut le reecrire, "ci" le traite comme une loi et echoue si le lock diverge de
# package.json.
RUN npm ci

# A l'execution, un bind mount recouvre ce code par les fichiers de l'hote ; la
# copie ne sert qu'au build autonome de l'image.
COPY . .

# Port du serveur de dev Vite, interne au reseau Docker.
EXPOSE 5173

# Forme JSON : pas de shell intermediaire, arret plus propre du process.
CMD ["npm", "run", "dev"]
