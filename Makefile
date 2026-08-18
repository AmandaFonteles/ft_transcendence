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

# Cible "down" : arrete et supprime les conteneurs, mais garde les volumes.
# Pourquoi garder les volumes : ne pas effacer la base a chaque arret.
down:
	$(COMPOSE) down

# Cible "re" : redemarrage complet = down puis up (make execute les deux dans l'ordre).
re: down up

# Cible "logs" : affiche en continu les logs de tous les services.
# Pourquoi -f ("follow") : suivre en direct, utile pour debugger un demarrage.
logs:
	$(COMPOSE) logs -f

# Cible "ps" : montre l'etat (up/healthy/exited) de chaque conteneur.
ps:
	$(COMPOSE) ps

# Cible "clean" : down + suppression des volumes (EFFACE les donnees de la base).
# Pourquoi separee de "down" : c'est destructif, on ne veut pas le faire par erreur.
clean:
	$(COMPOSE) down --volumes

# Cible "fclean" : clean + suppression des images construites (repart de zero).
fclean: clean
	$(COMPOSE) down --volumes --rmi all

# Declare ces noms comme "faux fichiers" : ce sont des labels de commandes, pas des
# fichiers a produire. Pourquoi : si un fichier nomme "up" existait, "make up" serait
# ignore ; .PHONY garantit que la recette s'execute toujours.
.PHONY: up down re logs ps clean fclean
