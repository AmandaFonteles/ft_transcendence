# Point d'entree unique du projet : personne n'a a retenir les commandes docker.

COMPOSE = docker compose

# --- Cycle de vie ------------------------------------------------------------

# Depend de .env : docker compose a besoin des variables POSTGRES_*.
up: .env
	$(COMPOSE) up --build -d

# Cible-fichier : un clone neuf fonctionne des le premier "make up", sans etape
# manuelle, en copiant le gabarit versionne.
.env:
	cp .env.example .env

# "|| true" : arreter ce qui n'est pas demarre n'est pas un echec, mais
# podman-compose sort quand meme en erreur.
down:
	$(COMPOSE) down --remove-orphans || true

# En recette et non en prerequis ("re: down up") : les prerequis peuvent etre
# evalues en parallele avec "make -j", ce qui lancerait un "up" pendant le "down".
re:
	$(MAKE) down
	$(MAKE) up

# --- Observation -------------------------------------------------------------

logs:
	$(COMPOSE) logs -f

ps:
	$(COMPOSE) ps

# --- Nettoyage ---------------------------------------------------------------

# EFFACE LA BASE DE DONNEES ET TOUS LES FICHIERS TELEVERSES (uploads_data).
# Separee de "down" volontairement : c'est irreversible.
clean:
	$(COMPOSE) down --volumes --remove-orphans || true

fclean:
	$(COMPOSE) down --volumes --remove-orphans --rmi all || true

# Faux fichiers : sans .PHONY, un fichier nomme "up" ferait ignorer "make up".
.PHONY: up down re logs ps clean fclean
