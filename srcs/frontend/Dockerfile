# =============================================================================
# Image frontend : Node + notre app React/Vite, lancee en mode DEV (hot reload).
# =============================================================================

# Part de l'image officielle Node 22, variante alpine (legere).
# Pourquoi Node : Vite et l'outillage React s'executent sur Node.
# Nom pleinement qualifie : sous Podman, un nom court declencherait une question
# interactive sur le registre a utiliser, ce qui casserait le "une seule commande".
FROM docker.io/library/node:22-alpine

# Definit /app comme dossier de travail : toutes les commandes suivantes s'y executent.
WORKDIR /app

# Copie d'abord SEULEMENT les manifestes (package.json et package-lock.json).
# Pourquoi separement : Docker met en cache les couches ; tant que package.json ne
# change pas, il reutilise le cache du "npm install" meme si le code change (rebuild rapide).
COPY package*.json ./

# Installe les dependances declarees dans package.json.
RUN npm install

# Copie ensuite tout le reste du code source dans l'image.
# Pourquoi apres l'install : a l'execution, un bind mount recouvre ce code par tes
# fichiers hote (edition a chaud), mais la copie sert au build autonome de l'image.
COPY . .

# Documente le port du serveur de dev Vite (interne au reseau Docker).
EXPOSE 5173

# Commande lancee au demarrage : le serveur de dev Vite.
# Pourquoi la forme JSON [...] : evite un shell intermediaire, arret plus propre du process.
CMD ["npm", "run", "dev"]
