# ft_transcendence — Base Docker

Squelette de départ pour le projet d'équipe. Il démarre **4 services** en une
commande et affiche une page d'index derrière `nginx` en HTTPS. Chaque membre
viendra ensuite greffer ses modules **à l'intérieur** de `frontend/` et
`backend/` (pas de nouveau conteneur par module).

## Ce que ça fait

- `nginx` reçoit tout le trafic sur `:443` (HTTPS, certificat auto-signé) et
  redirige `:80` → `:443`.
- Il sert le **frontend** React/Vite (avec hot-reload) sur `/`.
- Il relaie `/api/...` vers le **backend** NestJS.
- Le **backend** expose `GET /api/health` → `{ "status": "ok" }`.
- La page d'index affiche un **titre**, un **corps**, et l'état du backend
  (preuve que la chaîne navigateur → nginx → NestJS fonctionne).
- La **database** PostgreSQL tourne avec un volume persistant, prête pour l'ORM.

## Arborescence

```
.
├── Makefile              # `make up` / `make down` / `make logs` ...
├── docker-compose.yml    # orchestration des 4 services
├── .env.example          # gabarit de secrets (copié en .env automatiquement)
└── srcs/
    ├── nginx/            # reverse proxy + TLS
    ├── frontend/         # React + Vite + TypeScript
    ├── backend/          # NestJS
    └── database/         # PostgreSQL (image officielle, pas de Dockerfile)
```

## Lancer le projet

```bash
make up
```

Ouvre **https://localhost:8443** → accepte l'avertissement de certificat (normal
en local avec un certificat auto-signé). Tu dois voir le titre, le corps, et
« Backend: ok ».

> Ports **8080 / 8443** (et non 80 / 443) : un process non-root ne peut pas se lier
> aux ports < 1024. On les utilise partout, y compris en Docker classique, pour que
> toutes les machines de l'équipe se comportent pareil.

```bash
make logs   # logs en direct
make down   # tout arrêter
make clean  # arrêter + supprimer le volume de la base (efface les données)
make re     # redémarrage complet
```

Pour tout comprendre en détail (concepts, pièges, défense), voir **STUDY.md**.

## Exécution sans privilèges (machines 42)

Le projet est conçu pour tourner **sans droits root** : ports non privilégiés
(8080/8443), aucun besoin de VM.

Sur les machines de l'école, c'est **Podman** qui assure ce rôle — il est déjà
installé et fonctionne en rootless. Inutile donc d'installer un daemon Docker
rootless : la section ci-dessous décrit ce qui s'applique réellement.


### Sur les machines de 42 : c'est Podman, pas Docker

Sur les machines de l'école, la commande `docker` est en réalité un **shim vers
Podman** (`podman-docker`), qui délègue à `podman-compose`. Deux messages le
révèlent au lancement :

```
Emulate Docker CLI using podman. Create /etc/containers/nodocker to quiet msg.
>>>> Executing external compose provider "/usr/bin/podman-compose"
```

C'est sans gravité — le projet fonctionne — mais deux différences de comportement
ont dû être traitées.

**1. Noms d'images pleinement qualifiés.** Podman ne suppose pas que `postgres:16-alpine`
vient de Docker Hub : il pose une **question interactive** pour choisir le registre.
Cela casse l'exigence « déploiement en une seule commande, sans intervention
manuelle ». Toutes les images sont donc écrites en entier :

```yaml
image: docker.io/library/postgres:16-alpine
```
```dockerfile
FROM docker.io/library/node:22-alpine
```

Docker accepte la même syntaxe : **un seul fichier fonctionne dans les deux
environnements**, aucune version spécifique à maintenir.

**2. Ordre de démarrage.** `podman-compose` ignore souvent
`depends_on: condition: service_healthy`. Le backend démarrerait alors avant que
PostgreSQL accepte les connexions. `docker-entrypoint.sh` réessaie donc les
migrations jusqu'à 30 fois (60 s max) avant d'abandonner — robuste quel que soit
l'orchestrateur, sans dépendre de son comportement.

**Le message `nodocker`** demande un fichier dans `/etc`, donc les droits root : on
ne peut pas le faire disparaître sur une machine de l'école. C'est du bruit, sans
effet sur le fonctionnement.

> Optionnel, si tu veux aussi taper des noms courts en ligne de commande : créer
> `~/.config/containers/registries.conf` (per-utilisateur, sans root) contenant
> `unqualified-search-registries = ["docker.io"]`. Les fichiers du projet, eux,
> restent qualifiés pour ne dépendre d'aucune configuration de machine.

### Éviter de saturer le quota

En rootless, les images et volumes sont stockés dans le home, donc **dans le quota**.
Avec Podman, l'emplacement est `~/.local/share/containers`. On le déplace vers
`/goinfre` (sans quota) via `~/.config/containers/storage.conf` — fichier
per-utilisateur, aucun droit root nécessaire :

```ini
[storage]
driver = "overlay"
graphroot = "/goinfre/<login>/containers/storage"
runroot = "/run/user/1000/containers"
```

Remplacer `1000` par la sortie de `id -u`. `/goinfre` est purgé régulièrement : il
faudra parfois refaire un `make` complet.

Vérifier ensuite le driver de stockage — `vfs` duplique chaque couche au lieu de la
partager (disque saturé, builds très lents) :

```bash
podman info | grep -i "graphDriverName"   # attendu : overlay (pas vfs)
```

> Attention : modifier `storage.conf` invalide le stockage existant. Faire
> `podman system reset` avant, ou accepter de tout reconstruire.

## Schéma Prisma

Le schéma est appliqué avec **`prisma db push`** (approche déclarative), pas avec des
migrations versionnées. À chaque `make up`, l'entrypoint compare la base à
`schema.prisma` et applique directement la différence.

**Choix d'équipe assumé.** Le sujet n'exige pas de migrations : il demande un schéma
clair et des relations bien définies, ce que `schema.prisma` fournit directement.
`db push` permet d'itérer vite à quatre sur un schéma partagé, sans conflits de merge
dans un dossier `prisma/migrations/`.

**Contrepartie à connaître et à savoir dire en soutenance.** `--accept-data-loss`
autorise les changements destructeurs sans confirmation — indispensable en mode non
interactif. Renommer un champ **supprime** l'ancienne colonne et ses données. En
développement c'est sans gravité (les données sont jetables), mais il ne faut pas
compter sur la base pour conserver quoi que ce soit d'important.

### Au quotidien

Après avoir édité `prisma/schema.prisma` :

```bash
docker compose exec backend npx prisma db push
docker compose exec backend npx prisma generate
```

Ou simplement `make re` : l'entrypoint refait les deux au démarrage.

### Inspecter la base

```bash
docker compose exec backend npx prisma studio
```

Voir `../srcs/backend/prisma/InstructionsPrisma.md` pour les conventions de schéma
et le gabarit de module NestJS.

## Module temps réel (WebSocket)

Le backend expose un **gateway Socket.IO** partagé, monté sur `/socket.io` et
proxifié par nginx. C'est de l'**infrastructure** : le chat (Qu), les notifications
(Ai) et l'event backbone (Am) viendront s'y brancher.

### Fichiers

```
srcs/backend/src/realtime/
├── realtime.events.ts     # LE contrat : noms + formes des événements
├── presence.registry.ts   # qui est présent sur quel tableau (en mémoire)
├── realtime.gateway.ts    # handlers WebSocket + cycle de vie
└── realtime.module.ts     # assemblage (n'exporte que PresenceRegistry)

srcs/frontend/src/realtime/
├── events.ts              # copie CLIENT du contrat (garder les deux identiques)
├── socket.ts              # connexion partagée (singleton)
└── useBoardRealtime.ts    # hook React : join / présence / nettoyage
```

### État actuel : infrastructure prête, pas encore consommée

Le gateway exige une **identité authentifiée au handshake** : aucune socket ne
s'ouvre tant que le module d'auth (Qu) n'est pas branché. Le frontend n'appelle donc
volontairement pas `useBoardRealtime` pour l'instant — le composant de démonstration
et les identités « invitées » ont été retirés, car ils ne font pas partie du produit
final.

Le branchement réel se fera ainsi, dans le tableau d'Ai :

```tsx
// identity vient du module d'auth (Qu)
const { connected, members, lastMove } = useBoardRealtime(boardId, identity)
```

### Vérifier le gateway avant l'auth

En attendant, on peut le tester manuellement depuis la console du navigateur
(`https://localhost:8443`, deux onglets) :

```js
const s = io({ path: '/socket.io', transports: ['websocket'],
               auth: { userId: 'u1', displayName: 'Test' } })
s.on('presence:state', console.log)
s.emit('board:join', { boardId: 'b1' })
```

Le second onglet (avec `userId: 'u2'`) doit apparaître dans la présence du premier.
Vérifier aussi dans l'onglet **Réseau** des devtools que la connexion est bien en
`websocket` et non en `polling`.

### Points d'extension (`[SEAM]`)

Le code contient des marqueurs `[SEAM: ...]` là où les modules des coéquipiers se
brancheront :

| Marqueur | Propriétaire | À faire |
|----------|--------------|---------|
| `[SEAM: AUTH]` | Qu | Remplacer l'identité du handshake par la vérification du JWT |
| `[SEAM: PERMISSIONS]` | Am | Vérifier l'accès lecture/écriture au tableau |
| `[SEAM: PERSISTANCE]` | Ai | Enregistrer le déplacement **avant** de le diffuser |
| `[SEAM: EVENT BACKBONE]` | Am | Émettre un `activity_event` |

Détails, pièges et questions de défense : `STUDY.md`, section 11.

## Charte visuelle et scaffold frontend

Direction retenue : **« Atelier » (prédominante) fusionnée avec « Horaire »**.

- D'Atelier : base avoine, encre prune, pilules arrondies, avatars visibles, et
  surtout le **système de couleur par projet** — chaque projet a sa couleur, portée
  par une arête sur toutes ses tâches.
- D'Horaire : la rigueur du temps — police utilitaire à **chiffres tabulaires** pour
  dates et heures, **filets verticaux** sur l'agenda, marqueur du jour courant.

**Arbitrage important** : les couleurs sont réservées à l'identité des projets. Le
jour courant et les échéances sont donc signalés de façon **structurelle** (trait
d'encre, chiffres alignés), pas par une couleur — sinon la couleur ne voudrait plus
rien dire là où les tâches de plusieurs projets se mélangent.

### Solution de style : Tailwind CSS v4

Exigence obligatoire du sujet (« Use a CSS framework or styling solution ») ; la
grille d'évaluation précise que **le CSS pur seul ne suffit pas**.

Tailwind v4 s'intègre par un **plugin Vite**, pas par PostCSS : il n'y a donc ni
`postcss.config.js` ni `tailwind.config.js`. Le thème se déclare en CSS, dans le bloc
`@theme` de `styles/theme.css` — chaque variable y génère à la fois une variable CSS
et les classes utilitaires correspondantes (`--color-ink` → `bg-ink`, `text-ink`…).

### Fichiers

```
srcs/frontend/src/
├── styles/theme.css      # Tailwind + @theme : LA source de vérité visuelle
├── lib/projectColors.ts  # table de classes des couleurs de projet
├── components/
│   ├── AppShell.tsx      # ossature : en-tête fixe + contenu + pied de page
│   ├── Header.tsx        # logo, connexion, menu déroulant
│   ├── Footer.tsx        # contact, confidentialité
│   ├── TaskRow.tsx       # ligne de tâche avec l'arête de projet (la signature)
│   └── ui/               # 10 composants réutilisables (Button, Card, Badge,
│                         #   Avatar, AvatarGroup, TextField, EmptyState,
│                         #   SeamBlock, ProjectDot, PageHeading)
├── pages/                # une page par écran de la structure
└── App.tsx               # table de routage (carrefour, comme app.module.ts)
```

### Règles d'équipe

**Aucune couleur en dur.** On utilise les classes générées par le thème (`bg-paper`,
`text-ink-soft`, `bg-project-3`) ou les composants de `ui/`. C'est ce qui garantit que
les écrans de chacun se ressemblent sans concertation.

**Piège Tailwind à connaître.** Tailwind ne génère que les classes qu'il trouve
**écrites en toutes lettres** dans le code. Une classe construite dynamiquement —
`` `bg-project-${n}` `` — n'est jamais détectée : la couleur disparaît au rendu, sans
la moindre erreur. D'où la table de correspondance de `lib/projectColors.ts`, où
chaque classe est écrite intégralement.

### Routes

| URL | Écran | Propriétaire |
|-----|-------|--------------|
| `/` | Accueil public | Ny |
| `/connexion` | Connexion / inscription | Qu |
| `/tableau-de-bord` | Agenda général + projets | Ai |
| `/projets/nouveau` | Création de projet | Ai |
| `/projets/:projectId` | Page projet (tâches, chat, rôles) | Ai / Qu / Am |
| `/equipe` | Utilisateurs, amis, recherche | Qu |
| `/profil` | Profil personnel | Qu |

Les blocs encadrés en pointillés (`.seam`) marquent visuellement, **dans l'interface
elle-même**, les emplacements réservés à chaque module.

## Dépendances et lockfiles

Les versions sont **pinnées exactement** (aucun `^` ni `~`) dans les deux
`package.json`, et les `package-lock.json` sont committés. C'est ce qui garantit que
tout le monde — et l'évaluateur — installe strictement le même arbre.

### Pourquoi cette discipline

`package.json` exprime une **intention** (`^6.2.1` = « n'importe quel 6.x ≥ 6.2.1 »).
`package-lock.json` est un **fait** (`6.19.3`). Avec des `^`, chaque `npm install` sur
une machine sans lock valide réinterroge le registre et prend la version la plus
récente compatible **à cet instant** : deux personnes qui installent à trois jours
d'écart n'obtiennent pas le même arbre, d'où des diffs de milliers de lignes.

Constat réel avant remise à plat : **20 paquets avaient dérivé**, dont `@nestjs/*`
de 10.4.15 à 10.4.22 et Prisma de 6.2.1 à **6.19.3**, sans décision explicite.

> `prisma` (CLI) et `@prisma/client` doivent porter **strictement la même version**.
> Un décalage produit des erreurs de génération de client très obscures. Les deux
> sont aujourd'hui en `6.19.3`.

### Règles d'équipe

1. **On ne modifie jamais un lockfile à la main.** C'est un artefact généré.
2. **`npm install` ne sert qu'à ajouter ou retirer une dépendance.** On committe alors
   `package.json` **et** `package-lock.json` dans le **même commit** :
   `chore(backend): add socket.io 4.8.3`.
3. **Pour simplement installer l'existant : `npm ci`.** Jamais `npm install` « pour voir ».
4. **Une seule personne par lot de dépendances.** Deux ajouts en parallèle = conflit
   garanti. On se prévient avant.
5. **Le lockfile est committé, toujours.** Le mettre dans `.gitignore` rend `npm ci`
   impossible et détruit la reproductibilité.

### Fichiers de discipline

| Fichier | Rôle |
|---|---|
| `.nvmrc` | Version de Node commune (22), alignée sur les images Docker |
| `srcs/*/.npmrc` | `save-exact=true` : empêche npm de réintroduire des `^` |
| `.gitattributes` | Replie les diffs de lockfile et **interdit** leur fusion ligne à ligne |
| `engines` (package.json) | Refuse une version de Node ou npm incompatible |

Les `Dockerfile` utilisent **`npm ci`** et non `npm install` : `ci` traite le lockfile
comme une loi, supprime `node_modules`, installe exactement l'arbre figé, et **échoue**
si le lock diverge de `package.json`. Le build casse tôt et bruyamment plutôt que de
produire en silence un arbre différent.

### Résoudre un conflit sur un lockfile

On ne fusionne jamais ligne à ligne — le résultat serait un JSON incohérent.

```bash
# 1. Résoudre package.json À LA MAIN (court, lisible) en gardant les deux côtés.
# 2. Prendre n'importe quelle version du lock : elle sera écrasée.
git checkout --ours srcs/backend/package-lock.json
# 3. Régénérer le lock depuis le package.json fusionné (sans toucher node_modules).
cd srcs/backend && npm install --package-lock-only
# 4. Vérifier la cohérence avant de committer.
npm ci
```

## Stockage des fichiers téléversés

Le schéma définit `File` (avec `storagePath @unique`) et `FileAccess`. L'infrastructure
de stockage est en place ; le module `files/` reste à écrire (lane Ai).

### Ce qui existe

| Élément | Valeur | Où |
|---|---|---|
| Volume nommé | `uploads_data` | `docker-compose.yml` |
| Point de montage | `/var/lib/transcendence/uploads` | service `backend` |
| Variable de chemin | `UPLOAD_DIR` | `.env` |
| Limite applicative | `MAX_UPLOAD_SIZE_MB=10` | `.env` |
| Limite nginx | `client_max_body_size 12m` | `nginx.conf`, bloc `/api` |

**Pourquoi hors de `/app`.** `/app` contient le **code** (bind mount, versionné) ; le
volume contient des **données utilisateur**. Les monter séparément rend la frontière
physique et empêche des téléversements d'atterrir dans le dépôt git.

**Pourquoi un volume nommé.** Même raison que `postgres_data` : les fichiers doivent
survivre à `make down`. Seul `make clean` les efface — il supprime désormais **la base
et les fichiers**.

**Pourquoi nginx est réglé plus haut que l'application.** La valeur par défaut de nginx
est 1 Mo : sans `client_max_body_size`, tout fichier plus gros est rejeté par un 413
**avant** d'atteindre NestJS, qui ne peut alors produire aucun message utile. On règle
nginx à 12 Mo et l'application à 10 Mo, pour que le refus vienne du backend avec un
message clair.

### Contrat pour le module `files/` (Ai)

**`storagePath` ne doit jamais contenir le nom d'origine.** Il est `@unique` : générer
un nom opaque (`cuid()` + extension) et conserver le nom lisible dans `File.name`.
Trois raisons : pas de collision entre deux fichiers homonymes, pas de traversée de
chemin (`../../etc/passwd`), et aucune fuite d'information par le nom.

**Les fichiers doivent être servis par le backend, jamais par nginx directement.** Le
modèle porte une `VisibilityPolicy` (`PRIVATE`, `RESTRICTED`, `ALL_MEMBERS`) et une
table `FileAccess` : seul le code applicatif peut vérifier ces droits. Servir le volume
en statique depuis nginx court-circuiterait toute la logique de permissions. C'est
pourquoi `uploads_data` **n'est pas monté** dans le conteneur nginx.

**Écrire le fichier, puis la ligne en base — et nettoyer si la seconde échoue.** Une
écriture disque n'est pas transactionnelle : si `prisma.file.create()` échoue après la
copie, le fichier reste orphelin sur le volume.

**Valider le type réellement, pas seulement l'extension.** `mimeType` fourni par le
client est déclaratif et falsifiable.

```ts
// Lecture du chemin, jamais codé en dur.
const dir = process.env.UPLOAD_DIR ?? '/var/lib/transcendence/uploads'
```
