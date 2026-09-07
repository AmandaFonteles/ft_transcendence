#!/bin/sh
# Execute a chaque demarrage du conteneur backend : prepare Prisma avant NestJS.

# Arrete le script des la premiere erreur (evite de lancer Nest si Prisma echoue).
set -e

# --- 1. Prisma Client --------------------------------------------------------

# Genere au runtime : le client vit dans node_modules (volume anonyme), le
# regenerer ici garantit qu'il correspond toujours au schema.
echo "[entrypoint] prisma generate..."
npx prisma generate

# --- 2. Synchronisation du schema --------------------------------------------

# Choix d'equipe : "db push" (declaratif) plutot que des migrations versionnees.
# Iteration rapide a quatre sur un schema partage, et aucun conflit de merge dans
# un dossier prisma/migrations/.
# Contrepartie : --accept-data-loss autorise les changements destructeurs sans
# confirmation. Renommer un champ supprime l'ancienne colonne et ses donnees.
#
# La boucle ne depend pas de l'orchestrateur pour l'ordre de demarrage :
# podman-compose (utilise a l'ecole via le shim podman-docker) ignore souvent la
# condition "service_healthy" de depends_on, et le backend demarrerait avant que
# PostgreSQL accepte les connexions.
attempt=1
# 30 tentatives x 2 s = 60 s. Sans plafond, une vraie erreur (schema invalide,
# mauvais identifiants) bouclerait indefiniment sans jamais le signaler.
max_attempts=30

# "until CMD" reessaie tant que CMD echoue ; place dans une condition, l'echec
# n'est pas intercepte par "set -e".
until npx prisma db push --accept-data-loss; do
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "[entrypoint] echec de db push apres $max_attempts tentatives, abandon."
    exit 1
  fi
  echo "[entrypoint] base indisponible (tentative $attempt/$max_attempts), nouvel essai dans 2s..."
  attempt=$((attempt + 1))
  sleep 2
done

# --- 3. Lancement ------------------------------------------------------------

# "exec" : Node devient PID 1 et recoit les signaux d'arret de Docker/Podman.
echo "[entrypoint] starting NestJS..."
exec npm run start:dev
