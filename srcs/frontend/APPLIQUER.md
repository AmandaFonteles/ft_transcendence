# Frontend applicatif — nettoyage + génération

## 1. Supprimer les reliquats

Trois générations de frontend étaient empilées. Ces fichiers sont **morts**
(vérifié : plus aucun import ne les référence) :

```bash
git rm srcs/frontend/src/index.css
git rm srcs/frontend/src/styles/app.css
git rm srcs/frontend/src/styles/tokens.css
git rm srcs/frontend/src/realtime/RealtimeDemo.tsx

# Sortie de compilation committée par erreur (42 fichiers).
# `**/dist` est bien dans .gitignore, mais le dossier avait été ajouté avant.
git rm -r --cached srcs/backend/dist
rm -rf srcs/backend/dist
```

## 2. Remplacer le dossier frontend

Le dossier `frontend/` de ce zip remplace `srcs/frontend/`.
`public/avatars/`, `Dockerfile`, `package.json`, `vite.config.ts` et les
`tsconfig` sont **inchangés** — seul `src/` est reconstruit.

```bash
make re
```

## 3. Le problème principal qui a été corrigé

Lors du merge, le `App.tsx` de Qu — un banc de test **mono-page sans routage** —
a remplacé celui qui portait la table de routes. Conséquences en cascade :

- le routage avait disparu ; `pages/` et `components/ui/` étaient **orphelins** ;
- l'état d'authentification était **prisonnier de `App.tsx`**, donc aucune page ne
  pouvait appeler une route protégée ;
- l'interface utilisait `className="page"` et `.status`, classes définies dans
  l'ancien CSS supprimé → **plus aucun style ne s'appliquait**.

**Rien de la logique de Qu n'a été jeté.** Elle a été redistribuée :

| Logique | Nouvel emplacement |
|---|---|
| session, refresh, OAuth, login/signup/logout | `auth/AuthContext.tsx` |
| formulaire de connexion + 2FA à la saisie | `pages/LoginPage.tsx` |
| profil, avatar, mot de passe, activation 2FA | `pages/ProfilePage.tsx` |
| appels HTTP | `api.ts` (conservé, **étendu**) |

## 4. Pages réellement branchées sur l'API

| Page | Route | API utilisée |
|---|---|---|
| Accueil | `/` | `GET /health` |
| Connexion | `/connexion` | `auth/signup`, `auth/login`, OAuth 42 + GitHub |
| Tableau de bord | `/tableau-de-bord` | `GET /organizations` + tâches de chacun |
| Agenda (vue mois) | `/agenda` | idem, regroupé par jour |
| Créer un projet | `/projets/nouveau` | `POST /organizations` |
| Projet | `/projets/:id` | `GET /organizations/:id`, tâches, membres, discussion, fichiers |
| Amis | `/amis` | amis, demandes en attente, recherche d'utilisateurs |
| Profil | `/profil` | profil, avatar, mot de passe, 2FA |

Les pages protégées passent par `auth/RequireAuth.tsx`, qui redirige vers
`/connexion` **et mémorise la destination** pour y revenir après connexion.

## 5. Modules non terminés : emplacements visibles

Plus aucun bloc `SeamBlock` n'est monté : membres, discussion et fichiers sont
désormais branchés sur de vraies routes. Le composant
`components/ui/SeamBlock.tsx` est conservé le temps de la fusion des branches,
au cas où un coéquipier en pose encore un.

## 6. Deux limites connues

- **Couleur de projet** : le modèle `Organization` n'a pas de champ couleur. Elle
  est donc *dérivée du cuid* (`lib/projectColors.ts`, fonction `colorForId`) :
  déterministe, stable partout, sans stockage. Quand un champ `color` existera,
  il suffira de remplacer cet appel.
- **État 2FA** : `/users/me` ne renvoie pas si la 2FA est active. L'affichage
  repart donc à « inactive » après un rechargement, même si elle l'est. Un champ
  `twoFactorEnabled` dans la réponse suffirait.

## 7. Vérifié

```
npx tsc --noEmit   → aucune erreur
npx vite build     → 67 modules, build OK
```
