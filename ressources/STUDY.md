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

**Chargement de la page** `https://localhost/` :
1. Le navigateur ouvre une connexion TLS avec **nginx** (port 443).
2. nginx **déchiffre** le HTTPS (terminaison TLS) et applique `location /`.
3. Il **proxifie** vers `frontend:5173` (serveur Vite), qui renvoie la page React.

**Vérification du backend** (`fetch('/api/health')` dans `App.tsx`) :
1. La requête repart vers nginx (même origine `https://localhost`).
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

### 3.3 Redirection 80 → 443
- **Une phrase** : tout HTTP en clair est renvoyé vers HTTPS.
- **Snippet** : `return 301 https://$host$request_uri;`
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
  passer par `https://localhost`.

### 4.2 `host: true` + HMR à travers nginx
- **Une phrase** : Vite doit écouter sur 0.0.0.0 et savoir que le socket HMR passe
  par nginx (443, wss).
- **Snippet** :
  ```ts
  server: { host: true, hmr: { clientPort: 443, protocol: 'wss' } }
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
  qu'on passe par `https://localhost` et non `http://` ou `:5173`.
- « Backend: unreachable » → regarder `make logs` du service `backend` ; vérifier
  `location /api` dans `nginx.conf` et `setGlobalPrefix('api')`.
- Live-reload inactif → vérifier le bloc `hmr` de `vite.config.ts` et
  `CHOKIDAR_USEPOLLING=true` côté backend.
