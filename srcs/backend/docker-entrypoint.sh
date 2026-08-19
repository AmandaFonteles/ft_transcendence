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
echo "[entrypoint] prisma generate..."
npx prisma generate

# (2) Synchronise le schema avec la base (cree/modifie/supprime les tables).
# --accept-data-loss : autorise les changements DESTRUCTEURS sans confirmation.
# Pourquoi en DEV : quand on remplace un modele (ex. HealthCheck -> User), db push doit
# pouvoir supprimer l'ancienne table ; sans ce flag il refuse en mode non-interactif.
# A NE JAMAIS utiliser en production : la, on passera aux migrations versionnees.
echo "[entrypoint] prisma db push..."
npx prisma db push --accept-data-loss

# (3) Lance NestJS en mode watch. "exec" remplace le shell par le process Node.
# Pourquoi exec : Node devient le process principal (PID 1) et recoit correctement
# les signaux d'arret de Docker (arret propre du conteneur).
echo "[entrypoint] starting NestJS..."
exec npm run start:dev
