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

# (2) Synchronise la base avec le schema (cree/modifie/supprime les tables).
#
# [CONCEPT: db push, approche DECLARATIVE] Prisma compare la base au schema et
# applique directement la difference. Aucun fichier de migration n'est produit :
# la base est simplement "le resultat du dernier push".
# CHOIX D'EQUIPE ASSUME : on reste sur db push plutot que sur les migrations
# versionnees. Pourquoi : iteration rapide a quatre sur un schema partage, et zero
# conflit de merge dans un dossier prisma/migrations/. Le sujet n'exige pas de
# migrations : il demande un schema clair et des relations bien definies, ce que
# schema.prisma fournit directement.
# CONTREPARTIE A CONNAITRE : --accept-data-loss autorise les changements
# DESTRUCTEURS sans confirmation (indispensable en mode non interactif). Renommer
# un champ SUPPRIME l'ancienne colonne et ses donnees. En developpement c'est sans
# gravite (les donnees sont jetables) ; il faut juste le savoir et le dire.
#
# [CONCEPT: ne pas dependre de l'orchestrateur pour l'ordre de demarrage]
# docker-compose sait attendre que la base soit "healthy" (depends_on + condition),
# mais podman-compose — utilise sur les machines de l'ecole via le shim
# podman-docker — ignore souvent cette condition. Le backend demarrerait alors
# AVANT que PostgreSQL accepte les connexions, et db push echouerait.
# On reessaie donc ici : robuste quel que soit l'orchestrateur.
#
# Nombre de tentatives ecoulees.
attempt=1
# Plafond : 30 tentatives x 2 s = 60 s d'attente maximum.
# Pourquoi un plafond : sans lui, une VRAIE erreur (schema invalide, mauvais
# identifiants) bouclerait indefiniment sans jamais le signaler.
max_attempts=30

# Boucle jusqu'a ce que db push reussisse.
# "until CMD" reessaie tant que CMD echoue ; place dans une condition, l'echec
# n'est pas intercepte par "set -e".
until npx prisma db push --accept-data-loss; do
  # Abandonne si le plafond est atteint : l'erreur est alors reelle, pas transitoire.
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "[entrypoint] echec de db push apres $max_attempts tentatives, abandon."
    exit 1
  fi
  # Informe de la nouvelle tentative (visible dans "make logs").
  echo "[entrypoint] base indisponible (tentative $attempt/$max_attempts), nouvel essai dans 2s..."
  # Incremente le compteur.
  attempt=$((attempt + 1))
  # Laisse le temps a PostgreSQL de finir son initialisation.
  sleep 2
done

# (3) Lance NestJS en mode watch. "exec" remplace le shell par le process Node.
# Pourquoi exec : Node devient le process principal (PID 1) et recoit correctement
# les signaux d'arret de Docker/Podman (arret propre du conteneur).
echo "[entrypoint] starting NestJS..."
exec npm run start:dev
