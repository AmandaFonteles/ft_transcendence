# =============================================================================
# Makefile : point d'entree unique du projet.
# Un Makefile est une liste de "cibles" (raccourcis) vers des commandes shell.
# But : personne n'a a retenir les longues commandes docker ; on tape "make up".
# =============================================================================

# Definit une variable reutilisable pour ne pas repeter "docker compose".
# Pourquoi : si la commande change un jour, on ne la modifie qu'a un seul endroit.
COMPOSE = docker compose

# Cible "up" : construit les images et lance les conteneurs.
# Elle depend de ".env" : make s'assure d'abord que ce fichier existe (regle plus bas).
# Pourquoi cette dependance : docker compose a besoin des variables POSTGRES_* ;
# sans .env, le lancement echouerait des le demarrage de la base.
up: .env
# --build force la reconstruction des images (prend en compte tout changement de code).
# -d ("detached") rend la main : les conteneurs tournent en arriere-plan.
	$(COMPOSE) up --build -d

# Cible-FICHIER ".env" : si le fichier n'existe pas, make execute la recette.
# Pourquoi : un nouveau clone du depot fonctionne des le premier "make up",
# sans etape manuelle, en copiant le gabarit versionne.
.env:
# Copie le modele committe vers le vrai fichier de secrets (lui, ignore par git).
	cp .env.example .env

# "|| true" : si rien ne tourne, podman-compose sort en erreur. Or "arreter ce
# qui n'est pas demarre" n'est pas un echec, c'est un no-op. On absorbe donc ce
# cas precis plutot que de casser la chaine des cibles qui dependent de "down".
down:
	$(COMPOSE) down --remove-orphans || true

# Redemarrage complet.
# Ecrit en RECETTE et non en prerequis ("re: down up") : les prerequis peuvent
# etre evalues en parallele avec "make -j", ce qui provoquerait un "up" pendant
# le "down". Les appels explicites garantissent l'ordre en toute circonstance.
re:
	$(MAKE) down
	$(MAKE) up

# Cible "logs" : affiche en continu les logs de tous les services.
# Pourquoi -f ("follow") : suivre en direct, utile pour debugger un demarrage.
logs:
	$(COMPOSE) logs -f

# Cible "ps" : montre l'etat (up/healthy/exited) de chaque conteneur.
ps:
	$(COMPOSE) ps

# Arret + suppression des VOLUMES.
# EFFACE LA BASE DE DONNEES **ET** TOUS LES FICHIERS TELEVERSES (uploads_data).
# Separee de "down" volontairement : c'est irreversible, on ne veut pas le
# declencher par megarde.
clean:
	$(COMPOSE) down --volumes --remove-orphans || true

fclean:
	$(COMPOSE) down --volumes --remove-orphans --rmi all || true

# Declare ces noms comme "faux fichiers" : ce sont des labels de commandes, pas des
# fichiers a produire. Pourquoi : si un fichier nomme "up" existait, "make up" serait
# ignore ; .PHONY garantit que la recette s'execute toujours.
.PHONY: up down re logs ps clean fclean
