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

## Docker rootless (machines 42)

Le projet tourne en **Docker rootless** sans modification : ports non privilégiés,
aucun besoin de VM ni de Podman.

### Vérifier les prérequis (une fois par machine)

```bash
grep "^$USER:" /etc/subuid /etc/subgid   # doit renvoyer une ligne dans chaque fichier
which newuidmap newgidmap                # outils de mapping (paquet uidmap)
uname -r                                 # 5.11+ recommandé
```

Ces plages d'UID subordonnés se créent **avec root, une seule fois**. Si elles sont
absentes, rootless est impossible (Podman a le même prérequis) → repli sur une VM.

### Installer (sans privilèges)

```bash
dockerd-rootless-setuptool.sh install
export DOCKER_HOST=unix:///run/user/$(id -u)/docker.sock
loginctl enable-linger $USER    # le daemon survit à la déconnexion
```

### Éviter de saturer le quota

En rootless, Docker stocke tout dans `~/.local/share/docker`, donc **dans le quota**.
Déplacer le stockage vers `/goinfre` (sans quota) via `~/.config/docker/daemon.json` :

```json
{ "data-root": "/goinfre/<login>/docker" }
```

`/goinfre` est purgé régulièrement : il faudra parfois refaire un `make up` complet.

Vérifier enfin le driver de stockage — `vfs` duplique chaque couche (disque saturé,
builds lents) :

```bash
docker info | grep "Storage Driver"      # attendu : overlay2 ou fuse-overlayfs
```

## Migrations Prisma

Le schéma est appliqué via des **migrations versionnées** (fichiers SQL committés),
pas par `db push`. À chaque `make up`, l'entrypoint lance `prisma migrate deploy`,
qui applique les migrations manquantes dans l'ordre.

### Créer la migration initiale (une seule fois, à faire maintenant)

```bash
make clean     # base vide (les données de dev sont jetables)
make up        # démarre ; aucune migration à appliquer pour l'instant
docker compose exec backend npx prisma migrate dev --name init
git add srcs/backend/prisma/migrations && git commit -m "prisma: initial migration"
```

Entre `make up` et `migrate dev`, la table `users` n'existe pas encore : `/api/health`
renvoie une erreur transitoire, normale, résolue dès la migration appliquée.

### Au quotidien

```bash
# après avoir édité prisma/schema.prisma
docker compose exec backend npx prisma migrate dev --name <nom_du_changement>
# puis committer le dossier de migration généré
```

Voir `../srcs/backend/prisma/InstructionsPrisma.md` pour les conventions complètes.

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

### Fichiers

```
srcs/frontend/src/
├── styles/
│   ├── tokens.css        # LES JETONS : couleurs, espacements, rayons, polices
│   └── app.css           # base + composants partagés (bâtis sur les jetons)
├── components/
│   ├── AppShell.tsx      # ossature : en-tête fixe + contenu + pied de page
│   ├── Header.tsx        # logo, connexion, menu déroulant
│   ├── Footer.tsx        # contact, confidentialité
│   └── TaskRow.tsx       # ligne de tâche avec l'arête de projet (la signature)
├── pages/                # une page par écran de la structure
└── App.tsx               # table de routage (carrefour, comme app.module.ts)
```

### Règle d'équipe

**Personne n'écrit une couleur ou un espacement en dur.** On utilise les variables de
`tokens.css` (`var(--ink)`, `var(--space-4)`, `var(--project-3)`…). C'est ce qui
garantit que les écrans de chacun se ressemblent sans concertation. Pour ajouter un
écran : créer la page dans `pages/`, l'ajouter dans `App.tsx`, et réutiliser les
classes existantes (`.card`, `.btn`, `.task`, `.badge`, `.seam`).

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
