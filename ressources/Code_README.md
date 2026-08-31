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
