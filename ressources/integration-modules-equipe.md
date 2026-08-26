# Où s'intègre le code des modules dans ft_transcendence

> Note d'architecture — comment le travail des 4 membres (Ny, Qu, Am, Ai) se range
> dans la structure Docker, sans créer de conteneur ni de dossier supplémentaire.

---

## Réponse courte

Le code des modules **ne crée aucun nouveau dossier Docker**. Il s'insère *à
l'intérieur* de `frontend/` et `backend/`, sous forme de sous-dossiers par domaine.

La raison : on a **deux découpages orthogonaux** qui se superposent.

| Découpage | Sens | Rôle |
|-----------|------|------|
| **Docker** (nginx / frontend / backend / database) | Horizontal | L'*infrastructure* : par couche technique |
| **Les 14 modules 42** (auth, chat, board…) | Vertical | Les *fonctionnalités* : chacune traverse les couches |

Un module comme le **chat** de Qu n'est pas « quelque part » : il a un bout dans
`frontend/` (l'UI), un bout dans `backend/` (le gateway), et un bout dans la base
(le model `Message`). **Une fonctionnalité = une tranche verticale qui perce les
trois couches.**

---

## Le module comme tranche verticale

Chaque colonne ci-dessous est un module 42. On lit une colonne de haut en bas pour
voir où vit son code dans chaque couche.

| Couche \ Module | `auth` (Qu) | `chat` (Qu) | `board` (Ai + Ny) | `analytics` (Am) |
|-----------------|-------------|-------------|-------------------|------------------|
| **frontend/**   | login UI    | chat UI     | board UI          | dashboard        |
| **backend/src/**| `AuthModule`| `gateway`   | `boards/ lists/ cards/` | `analytics/` |
| **database**    | `User`      | `Message`   | `Board / List / Card` | `activity_events` |

Le découpage Docker (les lignes) reste stable ; les modules (les colonnes) viennent
se ranger dedans.

---

## Détail de vocabulaire : deux sens de « module »

Attention, le mot **« module »** a deux sens dans le projet :

- le **module 42** = la fonctionnalité qui rapporte des points ;
- le **module NestJS** = l'unité d'organisation du code back.

Bonne nouvelle : ils s'alignent presque **1:1**. Ton module 42 « Chat » devient un
`ChatModule` NestJS. C'est exactement la structure que NestJS attend.

---

## Où va le code de chacun

### Back — `backend/src/`

Chaque lane pose ses propres dossiers ; chaque dossier est un module NestJS.

```
backend/src/
├── main.ts                 # [Ny] bootstrap NestJS
├── app.module.ts           # [Ny] assemble TOUS les modules (chacun s'y branche)
├── prisma/                 # [Ny] PrismaService — module ORM
├── realtime/               # [Ny] gateway Socket.IO partagé — module WebSocket
├── auth/                   # [Qu] AuthModule + stratégies Passport / OAuth
├── users/                  # [Qu] User Management
├── chat/                   # [Qu] ChatModule (avec son propre namespace socket)
├── organizations/          # [Ai] Organizations
├── boards/  lists/  cards/ # [Ai + Ny] cœur produit (surface = Ai, temps réel = Ny)
├── notifications/          # [Ai] Notifications
├── collaboration/          # [Ai] édition collaborative (Yjs)
├── files/                  # [Ai] File Upload
├── permissions/            # [Am] Advanced Permissions (guards + decorators)
├── analytics/              # [Am] Analytics
└── events/                 # [Am] event backbone (activity_events)
```

### Front — `frontend/src/`

Même logique, avec des *feature folders*.

```
frontend/src/
├── main.tsx / App.tsx                # [Ny] scaffold, routing, providers
├── lib/  (api, socket, queryClient)  # [Ny] socle partagé par tous
└── features/
    ├── auth/   profile/              # [Qu]
    ├── chat/                         # [Qu]
    ├── board/   organizations/       # [Ai] (+ Ny pour la synchro live)
    ├── notifications/   files/       # [Ai]
    └── analytics/                    # [Am]
```

### Base — Prisma

**Un seul fichier**, `backend/prisma/schema.prisma`, où chacun ajoute ses `model`.
Il n'y a **pas** de « dossier database par personne » : le schéma est partagé.

---

## Les zones où les lanes se touchent

Ce sont les fichiers/briques modifiés par plusieurs personnes. À coordonner en
priorité.

1. **`schema.prisma`** — tout le monde y écrit ses models. C'est la source n°1 de
   conflits de merge. Discipline : petites PR, migrations nommées, et on prévient
   *avant* de toucher un model partagé (surtout `User`, que presque tout référence).

2. **Le gateway temps réel de Ny** (`realtime/`) — le chat (Qu), la collab et les
   notifications (Ai) s'y branchent. Ny fournit l'infra ; les autres consomment. Il
   faut un **contrat clair** sur les noms d'events (`card:moved`, `message:new`…).

3. **L'event backbone de Am** (`events/`) — l'auth, les boards, etc. *émettent* des
   `activity_events` ; les notifications (Ai) et l'analytics (Am) les *consomment*.
   Couplage voulu, très rentable, mais à cadrer tôt.

4. **`app.module.ts`** — Ny le tient, mais chacun doit y importer son module. Petit
   fichier, gros carrefour.

Le reste (auth, chat, boards…) est cloisonné dans son dossier : chacun bosse dans sa
lane sans marcher sur les autres, et à l'évaluation chaque personne ouvre *ses*
dossiers pour démontrer *ses* modules. C'est exactement l'organisation modulaire
visée.

---

## À retenir

- Docker découpe **horizontalement** (couches) ; les modules 42 sont des tranches
  **verticales** qui traversent ces couches.
- Le code d'un module se range **dans** `frontend/` et `backend/`, jamais dans un
  nouveau conteneur.
- Un module 42 côté back ≈ un module NestJS (`AuthModule`, `ChatModule`…).
- `schema.prisma`, le gateway `realtime/`, l'`events/` backbone et `app.module.ts`
  sont les 4 points de coordination partagés.
