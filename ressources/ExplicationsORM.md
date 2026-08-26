# L'ORM (Prisma) dans ft_transcendence

> Note explicative — comprendre ce qu'est un ORM, ce qu'est Prisma, son lien avec
> NestJS, et qui en dépend dans le projet. À lire avant de coder le module.

---

## 1. Ce qu'est un ORM (l'idée générale)

**ORM** signifie *Object-Relational Mapping* : « correspondance objet ↔ relationnel ».

Une base comme PostgreSQL raisonne en **tables**, **lignes** et **colonnes**, et on
lui parle en **SQL** :

```sql
SELECT * FROM "Card" WHERE "listId" = 42;
```

Ton code, lui, raisonne en **objets**. Un ORM est la couche qui traduit entre les
deux : tu manipules des objets dans ton langage, et l'ORM génère le SQL à ta place.

```ts
prisma.card.findMany({ where: { listId: 42 } })
```

**Pourquoi c'est utile :**
- moins de SQL écrit à la main ;
- protection automatique contre l'injection SQL ;
- surtout en TypeScript : des **types vérifiés à la compilation** (si `Card` n'a pas
  de champ `titel`, ça ne compile pas).

---

## 2. Ce qu'est Prisma en particulier

Prisma est un ORM « nouvelle génération » qui repose sur **trois pièces** :

1. **`schema.prisma`** — un seul fichier déclaratif, **source de vérité** des
   données. On y définit les modèles (`User`, `Board`, `List`, `Card`…) et la
   connexion à la base. C'est le fichier **partagé** qui sert de point de
   coordination à l'équipe.
2. **Prisma Migrate** — à partir du schéma, Prisma génère les **migrations** (les
   fichiers SQL qui créent/modifient les tables). On ne touche jamais le SQL soi-même.
3. **Prisma Client** — un client de requêtes **généré automatiquement** depuis le
   schéma, **entièrement typé**. C'est lui qui offre l'autocomplétion et
   `prisma.card.findMany(...)` avec des types corrects.

La connexion réutilise la variable **déjà posée dans le `.env`** :

```
DATABASE_URL=postgresql://transcendence:change_me@database:5432/transcendence
```

Le `database` est le **nom du service Docker** : Prisma parle au conteneur
PostgreSQL à travers le réseau privé, exactement comme nginx parle au backend.

---

## 3. Le lien avec NestJS

NestJS n'inclut pas Prisma d'office : on l'intègre. Et l'intégration réutilise
**exactement** l'injection de dépendance déjà vue dans la base Docker.

On enveloppe le client Prisma dans un **service injectable** :

```ts
// prisma.service.ts — le client Prisma exposé comme service NestJS
import { Injectable, OnModuleInit } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  // Hook de cycle de vie NestJS : ouvre la connexion au démarrage du module
  async onModuleInit() {
    await this.$connect()
  }
}
```

On l'expose dans un `PrismaModule`, puis n'importe quel service de fonctionnalité le
reçoit **dans son constructeur** — comme `AppController` recevait `AppService` :

```ts
@Injectable()
export class BoardsService {
  constructor(private prisma: PrismaService) {} // injection : on ne fait jamais "new"
  findAll() { return this.prisma.board.findMany() }
}
```

Autrement dit, le module ORM consiste à **fournir ce `PrismaService` une seule
fois**, et tout le monde le réutilise. C'est de l'**infrastructure partagée**, pas
une fonctionnalité isolée.

---

## 4. Qui en a besoin dans le projet

Réponse courte : **presque tout le monde**. Dès qu'un module stocke ou lit des
données persistantes, il passe par Prisma.

| Membre | Utilisation de l'ORM | Modèles typiques |
|--------|----------------------|------------------|
| **Ny** (toi) | *Construit* l'ORM (module Minor, 1 pt) ; le gateway temps réel s'en sert pour persister | `PrismaService`, `PrismaModule` |
| **Qu** | Auth, users, chat | `User`, `Credential`/`Session`, `Message` |
| **Ai** | Cœur produit (plus gros consommateur) | `Organization`, `Board`, `List`, `Card`, `Notification`, `File` |
| **Am** | Permissions et données | `Membership`/`Role`, `activity_events`, agrégats analytics |

**Pourquoi l'ORM est sur le chemin critique :** il rapporte peu de points à lui
seul, mais les trois autres lanes en dépendent pour écrire quoi que ce soit en base.

**Pourquoi le `schema.prisma` est sensible :** un seul fichier, quatre personnes qui
y ajoutent leurs modèles → discipline de merge nécessaire, surtout autour de `User`,
que presque tout référence.

---

## 5. Prochaines étapes d'implémentation

1. Installer Prisma dans le backend.
2. Écrire le `schema.prisma` de départ.
3. Créer le `PrismaModule` + `PrismaService`.
4. Brancher une première requête pour prouver la 4ᵉ couche (backend → PostgreSQL).
