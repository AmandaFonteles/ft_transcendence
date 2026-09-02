# Fiche de révision complète — Base Docker `ft_transcendence`

> À relire la veille de l'évaluation. Chaque concept suit le même format :
> **une phrase → extrait de code de NOTRE projet → quand/pourquoi → piège**.

---

## 0. Image mentale de départ

Deux découpages **orthogonaux** se superposent :

- **Docker découpe horizontalement** par couche technique : `nginx`, `frontend`,
  `backend`, `database`. C'est l'infrastructure.
- **Les modules 42 sont verticaux** : une fonctionnalité (chat, boards…) traverse
  plusieurs couches. Le code d'un module se range *dans* `frontend/` et `backend/`,
  jamais dans un nouveau conteneur.

Un seul service est exposé à l'extérieur : **nginx**. Tout le reste vit dans un
réseau privé, invisible depuis la machine hôte.

---

## 1. Le flux d'une requête (à savoir tracer à l'oral)

**Chargement de la page** `https://localhost:8443/` :
1. Le navigateur ouvre une connexion TLS avec **nginx** (port hôte 8443 -> 443 dans le conteneur).
2. nginx **déchiffre** le HTTPS (terminaison TLS) et applique `location /`.
3. Il **proxifie** vers `frontend:5173` (serveur Vite), qui renvoie la page React.

**Vérification du backend** (`fetch('/api/health')` dans `App.tsx`) :
1. La requête repart vers nginx (même origine `https://localhost:8443`).
2. nginx applique `location /api` et proxifie vers `backend:3000`.
3. NestJS sert `GET /api/health` (grâce à `setGlobalPrefix('api')`) et renvoie
   `{ "status": "ok" }`.
4. React met à jour l'état → l'écran affiche « Backend: ok ».

Le « ok » est la **preuve visuelle** que toute la chaîne est câblée.

---

## 2. Concepts Docker

### 2.1 Image vs conteneur
- **Une phrase** : une *image* est un modèle figé ; un *conteneur* est une instance
  qui tourne à partir de cette image.
- **Quand/pourquoi** : on construit une image (build) une fois, on lance autant de
  conteneurs qu'on veut. Ici 1 image = 1 service.
- **Piège** : modifier un fichier `Dockerfile` sans rebuild → l'ancienne image
  tourne encore. `make up` fait `--build` pour éviter ça.

### 2.2 Dockerfile & cache de couches
- **Une phrase** : chaque instruction du Dockerfile crée une couche mise en cache.
- **Snippet** (`srcs/backend/Dockerfile`) :
  ```dockerfile
  COPY package*.json ./
  RUN npm install
  COPY . .
  ```
- **Quand/pourquoi** : copier les manifestes AVANT le code permet de réutiliser le
  cache de `npm install` tant que `package.json` ne change pas → rebuilds rapides.
- **Piège** : mettre `COPY . .` avant `npm install` invalide le cache à chaque
  changement de code → réinstallation complète à chaque build.

### 2.3 docker-compose (orchestration)
- **Une phrase** : un seul fichier décrit tous les services, le réseau et les volumes.
- **Snippet** :
  ```yaml
  services:
    backend:
      build: ./srcs/backend
      depends_on:
        database:
          condition: service_healthy
  ```
- **Quand/pourquoi** : `docker compose up` monte toute la pile d'un coup (exigence
  du sujet : une seule commande).
- **Piège** : `depends_on` sans `condition` n'attend que le *démarrage* du conteneur,
  pas que l'app soit *prête*. D'où le healthcheck (2.6).

### 2.4 Réseau bridge + DNS interne
- **Une phrase** : les services d'un même réseau se joignent par leur *nom*.
- **Snippet** (`nginx.conf`) : `proxy_pass http://backend:3000;`
- **Quand/pourquoi** : pas d'IP en dur ; Docker résout `backend`, `frontend`,
  `database` automatiquement.
- **Piège** : publier des ports inutiles. Seul nginx a `ports:` ; les autres restent
  privés (isolation voulue par le sujet).

### 2.5 Volume nommé (persistance)
- **Une phrase** : un volume stocke les données *hors* du conteneur.
- **Snippet** :
  ```yaml
  volumes:
    - postgres_data:/var/lib/postgresql/data
  ```
- **Quand/pourquoi** : la base doit survivre à un `down`/redémarrage.
- **Piège** : `make clean` (`down --volumes`) supprime le volume → données perdues.

### 2.6 Healthcheck + `depends_on: condition`
- **Une phrase** : Docker teste périodiquement si un service répond vraiment.
- **Snippet** :
  ```yaml
  healthcheck:
    test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
  ```
- **Quand/pourquoi** : le backend démarre seulement quand la base est `healthy`.
- **Piège** : le double `$$` est obligatoire pour que **compose** n'interprète pas
  la variable ; c'est le shell *du conteneur* qui doit la lire à l'exécution.

### 2.7 Bind mount + volume anonyme `node_modules`
- **Une phrase** : on monte le code source pour le hot-reload, et on « protège »
  `node_modules` avec un volume anonyme.
- **Snippet** :
  ```yaml
  volumes:
    - ./srcs/backend:/app     # code live
    - /app/node_modules       # bouclier
  ```
- **Quand/pourquoi** : éditer un fichier sur l'hôte se reflète dans le conteneur ;
  le volume anonyme empêche le bind mount d'écraser les dépendances de l'image.
- **Piège** : sans la 2ᵉ ligne, l'app plante avec « module not found ». **Le** piège
  Docker + Node à connaître.

### 2.8 `env_file` et variables
- **Une phrase** : `.env` fournit les secrets aux conteneurs sans les coder en dur.
- **Snippet** : `env_file: .env` + `.gitignore` contenant `.env`.
- **Quand/pourquoi** : exigence du sujet — secrets hors de git, avec un
  `.env.example` versionné.
- **Piège** : committer le vrai `.env`. Toujours vérifier le `.gitignore`.

---

## 3. Concepts nginx

### 3.1 Reverse proxy
- **Une phrase** : nginx reçoit tout le trafic public et le relaie vers le bon
  service interne.
- **Snippet** :
  ```nginx
  location /api { proxy_pass http://backend:3000; }
  ```
- **Quand/pourquoi** : point d'entrée unique, pas de CORS (même origine), services
  internes cachés.
- **Piège** : ajouter un `/` final à `proxy_pass` change l'URI transmise. Ici on
  n'en met pas → `/api/health` arrive tel quel au backend.

### 3.2 Terminaison TLS + certificat auto-signé
- **Une phrase** : nginx déchiffre le HTTPS ; le certificat est généré au build.
- **Snippet** (`nginx/Dockerfile`) :
  ```dockerfile
  RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 ...
  ```
- **Quand/pourquoi** : satisfait la contrainte HTTPS du sujet sans autorité externe.
- **Piège** : le navigateur affiche un avertissement (« non fiable ») → **normal**
  en local, on clique « continuer ». Prod = vrai certificat (Let's Encrypt).

### 3.3 Redirection HTTP → HTTPS
- **Une phrase** : tout HTTP en clair est renvoyé vers HTTPS.
- **Snippet** : `return 301 https://$host:8443$request_uri;`
- **Piège** : oublier `:8443` → le navigateur est renvoyé vers un port non publié.
- **Quand/pourquoi** : aucun trafic non chiffré n'atteint l'application.

### 3.4 Montée en WebSocket (`map`)
- **Une phrase** : un WebSocket démarre par une requête HTTP avec `Upgrade`, qu'il
  faut laisser passer.
- **Snippet** :
  ```nginx
  map $http_upgrade $connection_upgrade { default upgrade; '' close; }
  proxy_set_header Upgrade    $http_upgrade;
  proxy_set_header Connection $connection_upgrade;
  ```
- **Quand/pourquoi** : fait fonctionner le HMR de Vite aujourd'hui et le Socket.IO
  de Ny demain, sans reconfiguration.
- **Piège** : oublier ces en-têtes → les WebSockets ne s'établissent jamais.

---

## 4. Concepts frontend (React + Vite)

### 4.1 Vite : outil de build + serveur de dev + HMR
- **Une phrase** : Vite bundle le code et, en dev, le sert avec rechargement à chaud.
- **Snippet** (`package.json`) : `"dev": "vite"`, `"build": "tsc && vite build"`.
- **Quand/pourquoi** : DX rapide en dev ; `build` produit les fichiers statiques
  pour la prod (servis par nginx plus tard).
- **Piège** : accéder directement à `:5173` (hors nginx) casse `/api` — toujours
  passer par `https://localhost:8443`.

### 4.2 `host: true` + HMR à travers nginx
- **Une phrase** : Vite doit écouter sur 0.0.0.0 et savoir que le socket HMR passe
  par nginx (8443, wss).
- **Snippet** :
  ```ts
  server: { host: true, hmr: { clientPort: 8443, protocol: 'wss' } }
  ```
- **Piège** : sans `host: true`, nginx obtient « connection refused » ; sans le bloc
  `hmr`, le live-reload échoue (mais la page se charge quand même).

### 4.3 React : composant, JSX, `createRoot`, `StrictMode`
- **Une phrase** : un composant est une fonction qui renvoie de l'UI (JSX) ; React
  la monte dans le DOM.
- **Snippet** (`main.tsx`) :
  ```tsx
  createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
  ```
- **Quand/pourquoi** : `createRoot` = API moderne React 18 ; `StrictMode` ajoute des
  vérifications de dev (sans effet en prod).
- **Piège** : le `!` après `getElementById` affirme à TS que l'élément existe ; il
  doit vraiment être présent dans `index.html`.

### 4.4 Hooks : `useState` / `useEffect`
- **Une phrase** : `useState` mémorise une valeur qui redéclenche l'affichage ;
  `useEffect` exécute un effet après le rendu.
- **Snippet** (`App.tsx`) :
  ```tsx
  const [apiStatus, setApiStatus] = useState('checking...')
  useEffect(() => { fetch('/api/health')... }, [])
  ```
- **Quand/pourquoi** : le `[]` = « une seule fois au montage » ; parfait pour un
  appel initial au backend.
- **Piège** : oublier le `[]` → l'effet se relance à chaque rendu (boucle d'appels).

### 4.5 `fetch` même-origine (pas de CORS)
- **Une phrase** : comme tout passe par nginx sur la même origine, aucun CORS n'est
  nécessaire.
- **Snippet** : `fetch('/api/health')` (URL relative, pas `http://backend:3000`).
- **Piège** : appeler le backend en absolu depuis le navigateur → problème CORS et
  URL interne invisible de l'extérieur.

---

## 5. Concepts backend (NestJS)

### 5.1 Bootstrap / `NestFactory`
- **Une phrase** : l'app se construit depuis le module racine, puis écoute.
- **Snippet** (`main.ts`) :
  ```ts
  const app = await NestFactory.create(AppModule)
  await app.listen(3000, '0.0.0.0')
  ```
- **Piège** : écouter sur `localhost` au lieu de `0.0.0.0` → nginx ne peut pas
  joindre le backend depuis un autre conteneur.

### 5.2 Module / Controller / Service
- **Une phrase** : le **module** assemble, le **controller** route, le **service**
  fait le travail.
- **Snippet** :
  ```ts
  @Module({ controllers: [AppController], providers: [AppService] })
  export class AppModule {}
  ```
- **Quand/pourquoi** : structure attendue par Nest et directement réutilisable pour
  les modules d'équipe (`ChatModule`, `BoardsModule`…).
- **Piège** : mettre la logique dans le controller. Le controller doit rester mince.

### 5.3 Décorateurs + `reflect-metadata`
- **Une phrase** : les décorateurs (`@Module`, `@Controller`, `@Get`, `@Injectable`)
  attachent des métadonnées lues par Nest à l'exécution.
- **Snippet** (`tsconfig.json`) :
  ```json
  "experimentalDecorators": true, "emitDecoratorMetadata": true
  ```
- **Piège** : sans ces deux flags (et sans `reflect-metadata`), le projet ne compile
  pas et l'injection ne fonctionne pas.

### 5.4 Injection de dépendance
- **Une phrase** : on demande un service dans le constructeur ; Nest fournit
  l'instance partagée.
- **Snippet** (`app.controller.ts`) :
  ```ts
  constructor(private readonly appService: AppService) {}
  ```
- **Quand/pourquoi** : code découplé et testable ; on ne fait jamais `new Service()`.
- **Piège** : oublier de déclarer le service dans `providers` du module → erreur
  « can't resolve dependencies ».

### 5.5 `setGlobalPrefix('api')`
- **Une phrase** : préfixe toutes les routes par `/api`.
- **Snippet** : `app.setGlobalPrefix('api')` → `@Get('health')` = `GET /api/health`.
- **Piège** : l'oublier casse l'alignement avec `location /api` de nginx (404).

---

## 6. Fichiers JSON non commentables (annotation ligne par ligne)

Ces fichiers sont du **JSON strict** : le moindre commentaire ferait échouer npm
ou le CLI Nest. Voici donc leur explication ici.

### 6.1 `srcs/frontend/package.json`
- `"name"` : nom du paquet (interne, non publié).
- `"private": true` : empêche une publication accidentelle sur npm.
- `"type": "module"` : active la syntaxe ES modules (`import/export`).
- `"scripts.dev": "vite"` : lance le serveur de dev.
- `"scripts.build": "tsc && vite build"` : vérifie les types puis produit le bundle.
- `"scripts.preview": "vite preview"` : sert localement le build de prod pour tester.
- `dependencies.react` / `react-dom` : la bibliothèque UI et son rendu DOM.
- `devDependencies.@types/react(-dom)` : types TypeScript de React (dev seulement).
- `devDependencies.@vitejs/plugin-react` : plugin qui apprend le JSX/TSX à Vite.
- `devDependencies.typescript` : le compilateur TS.
- `devDependencies.vite` : l'outil de build.

### 6.2 `srcs/backend/package.json`
- `"name"` / `"private"` : idem (paquet interne, non publiable).
- `"scripts.start": "nest start"` : démarre l'app une fois.
- `"scripts.start:dev": "nest start --watch"` : démarre en mode watch (recompile au save).
- `"scripts.build": "nest build"` : compile en JS dans `dist/`.
- `dependencies.@nestjs/common` : décorateurs et utilitaires de base de Nest.
- `dependencies.@nestjs/core` : le cœur (injection, cycle de vie).
- `dependencies.@nestjs/platform-express` : intègre Express comme serveur HTTP.
- `dependencies.reflect-metadata` : support runtime des métadonnées de décorateurs.
- `dependencies.rxjs` : programmation réactive (utilisée en interne par Nest).
- `devDependencies.@nestjs/cli` : la commande `nest` (start/build/generate).
- `devDependencies.@types/node` : types Node pour TypeScript.
- `devDependencies.typescript` : le compilateur TS.

### 6.3 `srcs/backend/nest-cli.json`
- `"$schema"` : URL du schéma pour l'autocomplétion/validation de l'éditeur.
- `"collection": "@nestjs/schematics"` : jeu de générateurs utilisés par `nest generate`.
- `"sourceRoot": "src"` : indique au CLI où se trouve le code source.

---

## 7. Préparation à la défense (questions probables)

- **« Pourquoi nginx et pas un accès direct au front/back ? »** → Point d'entrée
  unique, terminaison TLS, isolation des services, pas de CORS (même origine).
- **« Où irait le code du module chat de Qu ? »** → `backend/src/chat/` (un module
  Nest) + `frontend/src/features/chat/`. Pas de nouveau conteneur.
- **« Comment les conteneurs se trouvent-ils ? »** → Par leur *nom* de service, via
  le DNS interne du réseau bridge Docker.
- **« Que se passe-t-il si tu supprimes le volume `postgres_data` ? »** → On perd
  toutes les données ; il assure la persistance hors conteneur.
- **« À quoi sert le second volume `/app/node_modules` ? »** → Empêcher le bind
  mount d'écraser les dépendances installées dans l'image.
- **« Pourquoi `0.0.0.0` et `host: true` ? »** → Pour que nginx (autre conteneur)
  puisse joindre le backend et le serveur Vite à travers le réseau.
- **« Pourquoi `setGlobalPrefix('api')` ? »** → Aligner les routes Nest avec la règle
  `location /api` de nginx.
- **« C'est quoi l'injection de dépendance ici ? »** → `AppController` reçoit
  `AppService` par son constructeur ; Nest fournit l'instance, on ne l'instancie jamais.
- **« Pourquoi le navigateur affiche un avertissement ? »** → Certificat auto-signé,
  attendu en local ; en prod on utiliserait une vraie autorité de certification.

---

## 8. Checklist démarrage & dépannage

- `make up` échoue au tout début → vérifier que `.env` existe (créé auto la 1ʳᵉ fois).
- « module not found » côté front/back → le volume anonyme `/app/node_modules`
  manque, ou il faut rebuild après un changement de `package.json` (`make re`).
- Page blanche mais logs OK → accepter l'avertissement de certificat ; vérifier
  qu'on passe par `https://localhost:8443` et non `http://` ou `:5173`.
- « Backend: unreachable » → regarder `make logs` du service `backend` ; vérifier
  `location /api` dans `nginx.conf` et `setGlobalPrefix('api')`.
- Live-reload inactif → vérifier le bloc `hmr` de `vite.config.ts` et
  `CHOKIDAR_USEPOLLING=true` côté backend.

## 9. Ports non privilégiés & Docker rootless

- **Une phrase** : un process non-root ne peut pas se lier aux ports < 1024, donc on
  publie **8080/8443** au lieu de 80/443.
- **Snippet** (`docker-compose.yml`) :
  ```yaml
  ports:
    - "8080:80"
    - "8443:443"
  ```
- **Quand/pourquoi** : seul le port **hôte** est contraint ; nginx écoute toujours 443
  *dans* le conteneur. On garde ces ports même en Docker classique pour un
  comportement identique sur toutes les machines.
- **Sur les machines de 42** : c'est **Podman** qui fournit le rootless (déjà
  installé, via le shim `podman-docker`). Aucun daemon Docker rootless à installer.
- **Prérequis** : plages d'UID subordonnés dans `/etc/subuid` / `/etc/subgid` (créées
  avec root, une fois) — déjà en place à l'école.
- **Piège 42** : le stockage rootless vit dans le home → **quota saturé**. On déplace
  `graphroot` vers `/goinfre` via `~/.config/containers/storage.conf`.
- **Piège** : driver `vfs` (au lieu d'`overlay`) duplique chaque couche → disque plein
  et builds lents. Vérifier `podman info | grep -i graphDriverName`.
- **Bon effet de bord** : le root du conteneur = ton utilisateur hôte, donc plus de
  fichiers root-owned créés dans le dépôt par les bind mounts.

## 10. Application du schéma : `db push`

- **Une phrase** : `db push` est **déclaratif** — Prisma compare la base au schéma et
  applique directement la différence, sans produire de fichier de migration.
- **Snippet** (`docker-entrypoint.sh`) :
  ```sh
  npx prisma generate                    # regenere le client typé
  npx prisma db push --accept-data-loss  # synchronise la base avec schema.prisma
  ```
- **Choix d'équipe assumé** : le sujet n'exige pas de migrations versionnées ; il
  demande un schéma clair et des relations bien définies, ce que `schema.prisma`
  fournit. `db push` évite les conflits de merge à quatre dans `prisma/migrations/`.
- **Contrepartie** : `--accept-data-loss` autorise les suppressions **silencieuses**
  (renommer un champ supprime l'ancienne colonne et ses données). Sans ce drapeau,
  `db push` refuserait en mode non interactif — donc il est nécessaire ici.
- **À savoir répondre** : *« pourquoi pas de migrations ? »* → itération rapide à
  quatre, pas d'exigence du sujet, base de dev jetable. *« Et si vous alliez en
  production ? »* → on passerait à `prisma migrate dev` / `migrate deploy`, qui
  gardent un historique SQL committé et relisible en revue de code.
- **Piège** : compter sur la base pour conserver des données de test. Un changement de
  schéma peut les effacer sans prévenir.
- **Piège** : ignorer `prisma/` dans `.dockerignore` → plus de `schema.prisma` dans
  l'image, donc ni `db push` ni `generate` possibles là où il n'y a pas de bind mount.

## 11. Module majeur : WebSocket temps réel

### 11.1 Gateway NestJS
- **Une phrase** : un *gateway* est à WebSocket ce qu'un controller est à HTTP — il
  déclare des handlers d'événements au lieu de routes.
- **Snippet** :
  ```ts
  @WebSocketGateway({ path: '/socket.io' })
  export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() private server!: Server
    @SubscribeMessage(ClientEvents.JOIN_BOARD) async handleJoinBoard(...) {}
  }
  ```
- **Piège** : déclarer le gateway dans `controllers` — il va dans `providers`.

### 11.2 Rooms (salons)
- **Une phrase** : une room est une étiquette sur des sockets, qui permet de diffuser
  à un sous-ensemble précis.
- **Snippet** : `await client.join(boardRoom(boardId))` puis
  `client.to(room).emit(...)`.
- **`client.to(room)` vs `server.to(room)`** : le premier **exclut** l'émetteur, le
  second l'inclut. On exclut l'émetteur car son UI a déjà appliqué le changement en
  optimiste ; le lui renvoyer provoquerait un scintillement.
- **Piège** : croire qu'une room protège l'accès. **Non** — c'est un canal de
  diffusion, pas une autorisation. Le contrôle de permission est à faire explicitement.

### 11.3 Authentification au handshake
- **Une phrase** : on vérifie l'identité **une fois**, à l'ouverture de la connexion,
  pas à chaque événement.
- **Snippet** : `client.handshake.auth` lu dans `handleConnection`, puis
  `client.disconnect(true)` si invalide.
- **Pourquoi** : une socket non authentifiée ne doit jamais entrer dans une room.

### 11.4 Le piège de la reconnexion
- **Une phrase** : après une coupure, Socket.IO reconnecte avec un **nouvel id de
  socket**, qui n'appartient à **aucune room** — toutes les adhésions sont perdues.
- **Snippet** (`useBoardRealtime.ts`) :
  ```ts
  const onConnect = () => { socket.emit(ClientEvents.JOIN_BOARD, { boardId }) }
  socket.on('connect', onConnect)   // à CHAQUE connexion, pas seulement la première
  ```
- **Piège** : ne rejoindre qu'au montage du composant → après une micro-coupure, le
  client ne reçoit plus rien, **sans aucune erreur visible**.

### 11.5 Serveur = source de vérité
- **Une phrase** : on **persiste d'abord**, on **diffuse ensuite**.
- **Pourquoi** : diffuser sans persister fait diverger les clients de la base — la
  carte bouge à l'écran puis revient à sa place au rechargement.
- **Piège** : inverser l'ordre « pour que ce soit plus réactif ». La réactivité se
  gère côté client avec l'UI optimiste + rollback, pas en trichant côté serveur.

### 11.6 nginx et le WebSocket
- **Une phrase** : un bloc `location /socket.io` dédié est nécessaire, avec les
  en-têtes d'upgrade.
- **Snippet** :
  ```nginx
  location /socket.io {
      proxy_pass http://backend:3000;
      proxy_http_version 1.1;
      proxy_set_header Upgrade    $http_upgrade;
      proxy_set_header Connection $connection_upgrade;
      proxy_read_timeout 3600s;
  }
  ```
- **Piège n°1** : sans ces en-têtes, **aucune erreur** — Socket.IO bascule
  silencieusement en long-polling. Ça « marche » mais ce n'est plus du WebSocket.
  C'est pourquoi le client force `transports: ['websocket']` : on veut l'échec visible.
- **Piège n°2** : sans `proxy_read_timeout`, nginx coupe la connexion au repos (60s).

### 11.7 Frontières de module
- **Une phrase** : `RealtimeModule` n'exporte que `PresenceRegistry`, **pas** le gateway.
- **Pourquoi** : si le chat injectait le gateway, qui injectera les services du chat,
  on créerait une dépendance circulaire. Règle d'équipe : on **consomme** l'infra
  temps réel, on ne la pilote pas.

### 11.8 Questions probables (défense)
- *« Pourquoi la présence est-elle en mémoire et pas en base ? »* → Elle est éphémère ;
  la persister laisserait des fantômes après un crash. Limite assumée : une seule
  instance backend (sinon, adaptateur Redis).
- *« Que se passe-t-il si j'ouvre 3 onglets ? »* → 3 sockets, 1 seul utilisateur
  affiché (déduplication par `userId`), et le départ n'est annoncé que quand la
  **dernière** socket part (`hasOtherSocketOnBoard`).
- *« Pourquoi `position` est une chaîne ? »* → Indexation fractionnaire (LexoRank) :
  évite les conflits quand deux personnes réordonnent en même temps.
- *« Comment tu prouves que c'est du vrai temps réel ? »* → Deux onglets côte à côte
  sur le même tableau : la présence et le déplacement de carte apparaissent
  instantanément dans l'autre. On vérifie dans l'onglet **Réseau** des devtools que le
  transport est `websocket` et non `polling`.
- *« Pourquoi rien ne se connecte pour l'instant ? »* → Le gateway exige une identité
  authentifiée au handshake. L'infrastructure est prête et testable manuellement ; le
  branchement réel arrive avec l'auth (Qu) et le tableau (Ai). On a retiré les
  identités « invitées » et le simulateur : c'était de l'échafaudage, pas du produit.

## 12. Frontend : framework et solution de style

### 12.1 React compte-t-il comme framework ?
- **Une phrase** : oui — le sujet le dit explicitement, « React est considéré comme un
  framework dans ce contexte, en raison de son écosystème et de ses patterns
  architecturaux, même s'il s'agit techniquement d'une bibliothèque ».
- **Le module** : « Use a framework for both the frontend and backend » (Major) est
  couvert par **React** en front et **NestJS** en back, tous deux cités par le sujet.
- **Piège** : jQuery, Lodash et Axios ne sont **pas** des frameworks — le sujet les
  nomme comme contre-exemples. Savoir le dire à l'évaluateur.

### 12.2 Tailwind v4 : intégration
- **Une phrase** : depuis la v4, Tailwind s'intègre par un plugin Vite, et le thème se
  déclare en CSS — plus de `tailwind.config.js` ni de `postcss.config.js`.
- **Snippet** (`vite.config.ts` puis `styles/theme.css`) :
  ```ts
  plugins: [react(), tailwindcss()]
  ```
  ```css
  @import "tailwindcss";
  @theme { --color-ink: #2E2438; --font-data: 'Archivo', sans-serif; }
  ```
- **Pourquoi c'est obligatoire** : le sujet exige une solution de style, et la grille
  d'évaluation précise que **le CSS pur seul ne suffit pas**. Le correcteur demandera
  des exemples d'utilisation dans le code.
- **Ce que fait `@theme`** : chaque variable y génère à la fois une variable CSS
  (`var(--color-ink)`) et les classes utilitaires (`bg-ink`, `text-ink`, `border-ink`).

### 12.3 Le piège du scan de classes
- **Une phrase** : Tailwind ne génère que les classes **écrites en toutes lettres**
  dans le code source.
- **Snippet** (`lib/projectColors.ts`) :
  ```ts
  // NE MARCHE PAS : `bg-project-${n}`
  export const projectBg = { 1: 'bg-project-1', 2: 'bg-project-2' }  // table explicite
  ```
- **Piège** : l'échec est **silencieux** — pas d'erreur, juste une couleur absente.
  C'est l'erreur Tailwind la plus fréquente.

### 12.4 Décisions de design à savoir justifier
- **Les couleurs appartiennent aux projets.** Le jour courant et les échéances sont
  signalés de façon **structurelle** (trait d'encre, chiffres tabulaires), pas par une
  couleur — sinon la couleur ne voudrait plus rien dire sur l'agenda général, là où
  les tâches de plusieurs projets se mélangent.
- **Une seule action principale par écran** (`variant="primary"`).
- **Accessibilité** : anneau de focus visible jamais supprimé, `aria-label` sur les
  pastilles de couleur (une couleur seule n'est pas une information accessible),
  `prefers-reduced-motion` respecté.

### 12.5 Reste à faire (risque de rejet)
- Les pages **Confidentialité** et **Conditions** doivent contenir un contenu réel :
  la grille d'évaluation rejette explicitement les pages vides ou placeholder.

## 13. Podman sur les machines de 42

- **Une phrase** : à l'école, `docker` est un shim vers **Podman**
  (`podman-docker` → `podman-compose`) ; le projet tourne sans modification, à deux
  détails près.
- **Piège n°1 — registre non qualifié** : Podman ne suppose pas Docker Hub et pose
  une **question interactive** pour choisir le registre. Cela casse l'exigence
  « une seule commande sans intervention manuelle ».
  - **Correctif** : `image: docker.io/library/postgres:16-alpine`, et
    `FROM docker.io/library/node:22-alpine`. Docker accepte la même forme → un seul
    fichier pour les deux environnements.
- **Piège n°2 — ordre de démarrage** : `podman-compose` ignore souvent
  `depends_on: condition: service_healthy`.
  - **Correctif** : boucle de reprise dans `docker-entrypoint.sh` (30 tentatives,
    2 s d'intervalle) autour de `prisma db push`. On ne dépend plus du comportement
    de l'orchestrateur.
  - **Pourquoi un plafond** : sans lui, une vraie erreur (schéma invalide, mauvais
    identifiants) bouclerait indéfiniment sans jamais être signalée.
- **Message `nodocker`** : demande un fichier dans `/etc` → droits root, impossible
  à l'école. Bruit sans conséquence.
- **Question de défense** : « pourquoi les images sont-elles écrites en entier ? »
  → portabilité Docker/Podman et respect du déploiement non interactif.

## 14. Lockfiles et reproductibilité

### 14.1 `package.json` vs `package-lock.json`
- **Une phrase** : le premier exprime une **intention** (une plage de versions), le
  second est un **fait** (la photo exacte de l'arbre installé, dépendances
  transitives comprises).
- **Piège** : croire que `^6.2.1` protège des ruptures. Chez nous, il a laissé Prisma
  dériver de 6.2.1 à 6.19.3 — 17 versions mineures — sans décision.

### 14.2 `npm ci` vs `npm install`
- **Une phrase** : `install` traite le lockfile comme une suggestion et peut le
  réécrire ; `ci` le traite comme une loi et **échoue** si le lock diverge.
- **Snippet** (`Dockerfile`) : `RUN npm ci`
- **Pourquoi** : build reproductible qui casse tôt, plutôt qu'un build qui diverge en
  silence de celui des coéquipiers.
- **Piège** : `npm ci` exige un lockfile **présent et synchronisé**. Sans lui, échec.

### 14.3 Le champ `integrity`
- **Une phrase** : c'est le hash SHA-512 du tarball ; si un paquet est republié avec
  du code différent, le hash ne correspond plus et npm refuse d'installer.
- **Piège** : un lockfile généré hors-ligne ou depuis le cache peut perdre `resolved`
  et `integrity` → `npm ci` perd sa garantie de sécurité, et chaque coéquipier
  ré-ajoute/retire ces champs (des centaines de lignes de diff pour rien).
- **Vérifier** : `grep -c '"integrity"' package-lock.json`

### 14.4 Alignement Prisma
- **Une phrase** : `prisma` (CLI) et `@prisma/client` doivent porter **exactement** la
  même version, sinon la génération du client produit des erreurs obscures.
- **Chez nous** : les deux en `6.19.3`, pinnés sans `^`.
- **Piège** : rester sur la ligne v6 — la v7 impose une migration ESM, incompatible
  avec le CommonJS de NestJS.

### 14.5 Question de défense
*« Pourquoi avoir enlevé les `^` ? »* → Parce qu'ils laissaient l'arbre dériver sans
décision explicite, produisaient des diffs de lockfile énormes à chaque commit, et ne
garantissaient pas l'alignement CLI/client de Prisma. Le lockfile committé plus
`npm ci` donnent une installation identique partout.

## 15. Stockage des fichiers téléversés

### 15.1 Volume nommé, monté hors de `/app`
- **Une phrase** : les fichiers utilisateurs vivent dans un volume nommé
  `uploads_data`, monté sur `/var/lib/transcendence/uploads`, séparé du code.
- **Snippet** (`docker-compose.yml`) :
  ```yaml
  volumes:
    - ./srcs/backend:/app                                # code (bind mount)
    - uploads_data:/var/lib/transcendence/uploads        # données utilisateur
  ```
- **Pourquoi séparer** : `/app` est versionné et bind-monté ; y écrire des
  téléversements les ferait apparaître dans le dépôt git.
- **Piège** : `make clean` (`down --volumes`) efface désormais **la base ET les
  fichiers**. Ce n'est plus seulement la base.

### 15.2 `client_max_body_size` — le piège du reverse proxy
- **Une phrase** : nginx limite les corps de requête à **1 Mo par défaut**.
- **Snippet** (`nginx.conf`, bloc `/api`) : `client_max_body_size 12m;`
- **Piège** : sans cette ligne, un fichier de 3 Mo est rejeté par un **413 de nginx**,
  et NestJS ne voit jamais la requête — donc aucun message d'erreur applicatif. On
  cherche le bug dans le code alors qu'il est dans le proxy.
- **Astuce** : régler nginx (12 Mo) **au-dessus** de la limite applicative (10 Mo) pour
  que le refus vienne du backend, avec un message clair.

### 15.3 Pourquoi nginx ne sert pas les fichiers
- **Une phrase** : le modèle `File` porte une `VisibilityPolicy` et une table
  `FileAccess` ; seul le backend peut vérifier ces droits.
- **Conséquence** : `uploads_data` n'est **pas** monté dans nginx. Servir le dossier en
  statique donnerait accès à tout fichier dont on devine l'URL, en contournant les
  permissions.
- **Question de défense** : *« pourquoi ne pas laisser nginx servir les fichiers, c'est
  plus rapide ? »* → parce que la vitesse ne vaut rien face à une fuite de fichiers
  privés ; la vérification d'accès impose de passer par l'application.

### 15.4 `storagePath` opaque
- **Une phrase** : le chemin de stockage est un identifiant généré, jamais le nom
  d'origine (conservé, lui, dans `File.name`).
- **Trois raisons** : pas de collision entre homonymes, pas de traversée de chemin
  (`../../etc/passwd`), pas de fuite d'information par le nom du fichier.
