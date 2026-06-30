# 1. Cohérence globale du projet

**Votre choix de type de projet (Trello/Notion) est excellent et parfaitement cohérent avec vos modules.** Ce n'est pas un hasard : votre sélection recoupe presque à la lettre deux combos *recommandés par le sujet lui-même* (page 24) :

- **« Collaborative Workspace »** → Real-time collaborative features, User interaction, **Organization system**, File upload, **Advanced permissions**
- **« Task Management System »** → **Organization system**, User interaction, Real-time collaborative features, **Notification system**, **Analytics dashboard**

Vous avez donc convergé vers un assemblage que les concepteurs du sujet jugent déjà solide. C'est rassurant.

**Vérification des dépendances inter-modules (page 11 du sujet) :**

| Règle de dépendance | Vous concerne ? | Statut |
|---|---|---|
| Modules *Gaming* exigent un jeu | Non (aucun module gaming) | ✅ OK |
| *Game Statistics* exige un jeu | Non | ✅ OK |
| *Advanced chat* exige le chat de base | Non pris | ✅ OK |
| *SSR* incompatible avec *ICP blockchain* | Aucun des deux | ✅ OK |

→ **Aucun conflit de dépendance.** En évitant volontairement la voie « jeu », vous vous épargnez toute la chaîne de dépendances gaming. Bon choix stratégique pour une app productivité.

**Décompte des points** (Major = 2, Minor = 1) :

| Module | Type | Pts |
|---|---|---|
| Framework front+back | Major | 2 |
| User interaction (chat/profil/amis) | Major | 2 |
| Notification system | Minor | 1 |
| Real-time collaborative | Minor | 1 |
| File upload | Minor | 1 |
| Standard user management & auth | Major | 2 |
| OAuth 2.0 | Minor | 1 |
| Advanced permissions | Major | 2 |
| Organization system | Major | 2 |
| Analytics dashboard | Major | 2 |
| **TOTAL** | | **16** |

→ **16 points** pour 14 requis. Le coussin de +2 est conforme à la recommandation du sujet (« viser plus de 14 »). Mais **c'est trop juste** : la règle « module non fonctionnel = 0 point » est implacable. Si **un seul Major** rate à la défense, vous tombez à 14 (limite) ; deux Minors qui ratent et vous échouez. **Visez plutôt 18-19 budgétés.** Voir la critique.

---

# 2. Critique détaillée — les points à corriger

### 🟢 a) Deux points quasi gratuits que vous laissez sur la table

**Le Major « Real-time features (WebSockets) » (+2 pts).** Vous prenez le *Minor* « Real-time collaborative features » mais **pas** le *Major* « real-time features via WebSockets » — alors que vous **allez construire toute l'infrastructure WebSocket de toute façon** (collaboration live + chat + notifications temps réel ont tous besoin de la même tuyauterie). Le Major exige : *« mises à jour temps réel entre clients, gestion connexion/déconnexion, broadcasting efficace »* — c'est exactement le cœur d'un board Trello où déplacer une carte se reflète instantanément chez tout le monde. **Vous faites le travail dur, ne le claimez qu'une fois sur deux.**

> ⚠️ Lors de la défense, démontrez-les comme **deux livrables distincts** : le *Major* = synchro live des cartes + présence + reconnexion gracieuse ; le *Minor* = édition collaborative (curseurs partagés sur une description/doc, type CRDT). Sinon l'évaluateur peut considérer que c'est « la même feature comptée deux fois ».

**Le Minor « Use an ORM » (+1 pt).** Avec un domaine aussi relationnel (users ↔ orgs ↔ boards ↔ lists ↔ cards ↔ permissions), vous **utiliserez forcément un ORM** (Prisma, TypeORM, Sequelize, Django ORM…). C'est 1 point pour rien, déjà fait par construction.

→ **Avec ces deux ajouts : 16 → 19 points budgétés**, ~14-16 réellement validés = **marge de sécurité confortable**.

### 🟠 b) Risque de double-comptage à neutraliser

Deux de vos Majors se chevauchent sur le **système d'amis** :
- **User interaction** (Web) inclut : chat + voir profil + **amis (add/remove/list)**
- **Standard user management** (User Mgmt) inclut : éditer profil + avatar + **amis + statut en ligne**

Un évaluateur tatillon refusera de compter deux fois la « feature amis ». **Délimitez clairement** :
- *User interaction* = **le CHAT** (send/receive — c'est ça la vraie substance distincte) + consultation de profil.
- *Standard user mgmt* = **édition de profil + upload avatar + présence (online status)**.

Idem **avatar (user mgmt) vs File upload system (Minor)** : l'avatar n'est qu'un cas particulier. Pour valider le Minor File upload, la démo doit montrer le **système complet** (multi-types, validation client **et** serveur, stockage sécurisé, preview, progress bar, suppression) — pas juste l'avatar.

### 🔴 c) Le « produit cœur » n'est budgété nulle part (risque n°1)

**Construire les boards / listes / cartes / drag-and-drop n'est AUCUN module** — c'est la partie obligatoire « build a web application » elle-même, sans points. Or c'est ~8-12 jours de dev. Personne ne l'a dans `modules.txt`. **Donnez-lui un owner explicite** (naturellement couplé à *Organization system* + *Framework*) et réservez-lui du temps, sinon vous aurez 19 points de modules… greffés sur un produit inexistant.

### 🟡 d) OAuth partagé Qu/Ai = inefficace

Partager un Minor à 1 point entre deux personnes coûte plus en coordination que ça ne rapporte. **Attribuez-le à une seule personne.** Comme OAuth se branche sur le modèle de session/JWT que **Qu** construit pour l'auth de base, le garder chez **Qu** évite un handoff bug-prone (une stratégie Passport supplémentaire sur l'auth existante).

### 🟢 e) Architecture : un « event backbone » partagé (décision clé à prendre tôt)

**Notifications (Ai), Analytics (Am), et l'audit/historique partagent la même source : un flux d'événements.** Concevez **dès le départ** une table/stream `activity_events` (qui a fait quoi, quand, sur quelle ressource). Une seule brique alimente :
- les **notifications** temps réel (Ai),
- le **dashboard analytics** (Am, agrégations),
- l'**historique d'activité** des boards (produit cœur),
- le suivi de **présence/collaboration**.

C'est le meilleur levier d'efficacité de tout le projet : **Am doit poser ce backbone tôt** car Ai et le produit en dépendent.

### ⏱️ f) Réalisme du planning (fin août = ~9 semaines)

Estimation brute : ~**84 jours-dev** (modules + produit cœur + infra obligatoire). À 4 personnes sur 9 semaines avec ~50-60 % de temps réellement productif → ~90-100 jours-personne disponibles. **C'est faisable mais avec quasi zéro marge.** Conséquences :
- **19 points est votre plafond réaliste.** N'ajoutez rien d'autre.
- Les bonus « jaunes » (**WAF/ModSecurity + Vault**, **ELK**, **health-check/backups**) sont **irréalistes** dans cette fenêtre — WAF+Vault à eux seuls valent un sprint entier. Gardez-les en « si miracle ».
- **Verrouillez le scope maintenant.** Le sujet le dit noir sur blanc (page 5) : *« Poor early choices and lack of coordination will cost a lot of time. »*

---

# 3. Répartition optimisée

**Principe : organiser par *lane* (couloir technique cohérent) plutôt que par points bruts**, pour que chacun s'enfonce dans un domaine au lieu de papillonner, et **séquencer par dépendances** (les fondations d'abord).

### Votre version vs ma proposition

| Personne | Votre version (16 pts) | **Proposition affinée (19 pts)** | Couloir |
|---|---|---|---|
| **Ny** | Framework (2) + Real-time collab (1) + File upload (1) = **4** | Framework (2) + **Real-time WS Major (2, NEW)** + **ORM (1, NEW)** = **5** | **Plateforme & temps réel** (le backbone) |
| **Qu** | User interaction (2) + User mgmt (2) + OAuth (0,5) = **4,5** | User mgmt/auth (2) + User interaction/chat (2) + OAuth (1, **solo**) = **5** | **Auth & social** |
| **Am** | Permissions (2) + Analytics (2) = **4** | Permissions (2) + Analytics (2) + **owns l'event backbone** = **4** | **Contrôle d'accès & data** |
| **Ai** | Notif (1) + OAuth (0,5) + Organization (2) = **3,5** | Organization (2) + Notifications (1) + **Real-time collab (1, ← de Ny)** + **File upload (1, ← de Ny)** = **5** | **Cœur produit & collaboration** |

**Ce qui change et pourquoi :**
- **Ny devient le pur owner de l'infrastructure** (framework + gateway WebSocket réutilisé par tous + ORM/schéma). Cohérent : tout le monde construit *sur* Ny. Les deux Minors collab/upload partent chez Ai.
- **Qu** garde un couloir net auth+social, **OAuth solo** (plus de partage). Couloir le plus *critique-path* → Qu doit livrer l'auth **vite** pour débloquer les autres.
- **Am** : 4 points mais **deux Majors cross-cutting** (permissions touche TOUT, analytics dépend des données) ≈ 5 points d'effort. Am pose l'event backbone tôt.
- **Ai** récupère le « couloir surface produit » (orgs + édition collab + notifs + pièces jointes) — tout vit dans l'UI board/carte. **Risque** : couloir le plus *aval* (dépend de l'auth de Qu, de l'infra de Ny, des permissions d'Am) → Ai **démarre par Organization system** (ne dépend que de l'auth) pendant que l'infra mûrit.

**Charge finale : Ny 5 / Qu 5 / Am 4 / Ai 5 = 19**, bien équilibrée.

### Séquencement recommandé (le plus important)

```
Semaines 1-2  │ FONDATIONS (bloquent tout le reste)
              │  Ny: scaffold front+back + Docker + nginx/TLS + ORM + schéma DB
              │  Qu: auth (signup/login, hash+salt, sessions/JWT)
              │  Tous: schéma DB co-conçu, event backbone défini (Am)
─────────────────────────────────────────────────────────────────
Semaines 3-5  │ CŒUR DOMAINE
              │  Ai: Organization system + début produit (boards/lists/cards)
              │  Am: Advanced permissions (roles/guards) — dès que auth+orgs prêts
              │  Ny: gateway WebSocket (Real-time Major) + présence
              │  Qu: profil/avatar/présence + OAuth
─────────────────────────────────────────────────────────────────
Semaines 5-7  │ TEMPS RÉEL & SOCIAL
              │  Qu: chat (User interaction) sur l'infra WS
              │  Ai: notifications temps réel + édition collaborative (Yjs)
              │  Ny: File upload (déplacé si besoin) / Ai
─────────────────────────────────────────────────────────────────
Semaines 7-8  │ DATA & FINITIONS
              │  Am: Analytics dashboard (consomme l'event backbone)
              │  Tous: Privacy/ToS, validation front+back, responsive, no console errors
─────────────────────────────────────────────────────────────────
Semaine 9     │ GEL, tests multi-users concurrents, prépa défense (chacun sait
              │ expliquer SES modules — critère explicite de la grille)
```

---

# 4. Tableau des notions, concepts & stack par module

**Stack global recommandé : TypeScript de bout en bout.** Pour une équipe de 4 sur une app temps-réel très relationnelle, c'est le meilleur choix (un seul langage = entraide facile + types partagés front/back).

> **Front** : React + Vite + TypeScript + Tailwind CSS — **Back** : **NestJS** (structure modulaire = 1 module NestJS par feature, *guards* parfaits pour les permissions, *gateway* WebSocket intégré) — **ORM** : Prisma — **DB** : PostgreSQL (JSONB pour le contenu flexible des cartes) — **Temps réel** : Socket.IO (+ Yjs pour le collaboratif CRDT) — **Auth** : Passport + JWT + Argon2 — **Infra** : Docker Compose + nginx (TLS) — **Redis** (optionnel) pour le pub/sub WebSocket et le cache.

### Table A — Notions, concepts & meilleur stack

| Module | Notions & concepts à maîtriser | Meilleur stack / tech |
|---|---|---|
| **Framework front+back** (M) | Architecture SPA, routing client/serveur, build/bundling, conventions de framework, séparation front/back | React+Vite (front) · **NestJS** (back) · structure en modules |
| **Real-time WS Major** (M, *new*) | WebSocket vs HTTP, *rooms*/channels, broadcasting, gestion connexion/déconnexion, *heartbeat*, reconnexion | **Socket.IO** sur NestJS Gateway · Redis adapter (scale) |
| **ORM Minor** (m, *new*) | Mapping objet↔relationnel, migrations, relations (1-N, N-N), requêtes typées, N+1 problem | **Prisma** + PostgreSQL |
| **Standard user mgmt & auth** (M) | Hash+**salt** (jamais en clair), JWT vs sessions, *refresh tokens*, validation, upload avatar, présence | Passport-local · **Argon2**/bcrypt · JWT |
| **OAuth 2.0** (m) | Flow *authorization code*, redirect URI, *callback*, échange de token, **account linking**, scopes | Passport-OAuth2 (Google/GitHub/42) |
| **User interaction / chat** (M) | Messagerie temps réel, persistance des messages, modèle profil, relation d'amitié (N-N auto-référente) | Socket.IO (chat) · Prisma (historique) |
| **Advanced permissions** (M) | **RBAC** (roles), autorisation vs authentification, *guards*/middlewares, contrôle par ressource, UI conditionnelle | **NestJS Guards** + CASL (ou policies maison) |
| **Organization system** (M) | Multi-tenancy léger, *scoping* des données par org, membership, rôles intra-org, CRUD imbriqué | Prisma (relations org↔user↔board) |
| **Notification system** (m) | Pattern *event-driven*, fan-out, lu/non-lu, push temps réel, persistance | **Event backbone** + Socket.IO + Prisma |
| **Real-time collaborative** (m) | **CRDT**, résolution de conflits sans verrou, *awareness* (curseurs), édition concurrente | **Yjs** + y-websocket · Tiptap (si rich text) |
| **File upload** (m) | Multipart, validation type/taille (client **et** serveur), stockage sécurisé, *access control*, preview, progress | Multer (NestJS) · stockage volume ou **MinIO** (S3) |
| **Analytics dashboard** (M) | Agrégations SQL, séries temporelles, dataviz, export PDF/CSV, filtres/date ranges, temps réel | **Recharts**/Chart.js · papaparse (CSV) · jsPDF |
| ⚠️ *Cœur produit (boards/cards)* — **non-module** | CRUD imbriqué, **drag-and-drop**, ordering (rang fractionnaire), optimistic UI | **dnd-kit** (React) · Prisma |
| *Infra obligatoire* — **non-module** | Containerisation 1 commande, **TLS/HTTPS**, .env (gitignore) + .env.example, Privacy/ToS | Docker Compose · **nginx** (reverse proxy + certs) |

### Table B — Planning & organisation

| Module | Pts | Owner proposé | Dépend de | Temps estimé | Difficulté |
|---|---|---|---|---|---|
| Framework front+back | 2 | **Ny** | — | 4-6 j | 🟡 Moyen (mais fondation) |
| Real-time WS Major *(new)* | 2 | **Ny** | Framework | 5-7 j | 🔴 Élevé |
| ORM *(new)* | 1 | **Ny** | Framework | 3-4 j | 🟢 Faible |
| Standard user mgmt & auth | 2 | **Qu** | ORM | 6-8 j | 🟡 Moyen, **critique** |
| OAuth 2.0 | 1 | **Qu** | Auth de base | 3-4 j | 🟡 Moyen (config providers) |
| User interaction / chat | 2 | **Qu** | WS infra, auth | 5-7 j | 🟡 Moyen |
| Advanced permissions | 2 | **Am** | Auth + Orgs | 6-8 j | 🔴 Élevé (cross-cutting) |
| Organization system | 2 | **Ai** | Auth | 6-8 j | 🟡 Moyen, **backbone produit** |
| Notification system | 1 | **Ai** | Event backbone, WS | 5-6 j | 🟡 Moyen |
| Real-time collaborative | 1 | **Ai** | WS infra | 6-9 j | 🔴 Élevé (CRDT) |
| File upload | 1 | **Ai** (ou Ny) | Framework | 4-5 j | 🟢 Faible-moyen |
| Analytics dashboard | 2 | **Am** | Event backbone + données | 6-8 j | 🟡 Moyen-élevé |
| ⚠️ *Cœur produit* | 0 | **Ai + Ny** | Framework, orgs | 8-12 j | 🔴 **À ne pas oublier** |
| *Infra obligatoire* | 0 | **Ny** + tous | — | 4-6 j (étalé) | 🟡 Moyen |

---

# 5. À retenir & prochaine étape

**Verdict :** votre sélection est **cohérente et bien pensée** — elle colle aux combos recommandés du sujet. Mes corrections sont chirurgicales, pas une refonte :

1. **+2 pts gratuits** : claimez le Major *Real-time WebSockets* (vous faites déjà le travail).
2. **+1 pt gratuit** : claimez le Minor *ORM*.
3. **OAuth solo** chez Qu (plus de partage).
4. **Délimitez** le double-comptage *amis* (chat ≠ user-mgmt) et *avatar* ≠ *file system*.
5. **Donnez un owner au cœur produit** (boards/cards) — il n'est dans aucun module.
6. **Posez l'event backbone tôt** (Am) — il alimente notifs + analytics + historique.
7. **Séquencez par dépendances**, pas par points : fondations (Ny+Qu) d'abord.
8. **19 points est le plafond réaliste** d'ici fin août — oubliez WAF/Vault/ELK.

---
