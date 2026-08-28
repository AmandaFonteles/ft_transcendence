#!/bin/sh
# =============================================================================
# docker-entrypoint.sh : execute a CHAQUE demarrage du conteneur backend.
# Il prepare Prisma AVANT de lancer NestJS.
# =============================================================================

# Arrete le script des la premiere erreur (evite de lancer Nest si Prisma echoue).
set -e

# (1) Genere le Prisma Client a partir du schema.
# Pourquoi au runtime : le client vit dans node_modules (volume anonyme, persiste) ;
# le regenerer ici garantit qu'il correspond TOUJOURS au schema, meme apres edition.
# Pourquoi AVANT migrate deploy : contrairement a "db push", "migrate deploy" ne
# regenere PAS le client ; sans cette etape, le client pourrait etre perime.
echo "[entrypoint] prisma generate..."
npx prisma generate

# (2) Applique les MIGRATIONS VERSIONNEES en attente, dans l'ordre.
# Prisma lit la table _prisma_migrations (dans la base) pour savoir lesquelles ont
# deja tourne, et n'applique que les manquantes.
# Pourquoi migrate deploy et non migrate dev : "deploy" n'invente aucune migration et
# ne supprime rien de lui-meme -> c'est la commande SURE, valable en dev comme en prod.
# Pourquoi plus de "db push --accept-data-loss" : il synchronisait la base sans laisser
# de trace et pouvait supprimer silencieusement une table/colonne. L'historique est
# desormais dans prisma/migrations/, committe et relisible en revue de code.
echo "[entrypoint] prisma migrate deploy..."
npx prisma migrate deploy

# (3) Lance NestJS en mode watch. "exec" remplace le shell par le process Node.
# Pourquoi exec : Node devient le process principal (PID 1) et recoit correctement
# les signaux d'arret de Docker (arret propre du conteneur).
echo "[entrypoint] starting NestJS..."
exec npm run start:dev
