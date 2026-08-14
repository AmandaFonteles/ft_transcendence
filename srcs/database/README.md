# database/

Volontairement presque vide.

PostgreSQL tourne depuis l'**image officielle `postgres:16-alpine`** declaree dans
`docker-compose.yml` — aucun Dockerfile custom n'est necessaire. Les donnees sont
persistees dans le volume nomme `postgres_data`.

Le module ORM de Ny (Prisma) ajoutera ensuite le schema et les migrations ; d'eventuels
scripts SQL d'initialisation iraient dans un dossier `init/` monte dans l'image.
