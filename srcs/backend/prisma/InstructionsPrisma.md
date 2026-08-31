# Instructions Prisma — ft_transcendence

> **Document figé, à respecter par toute l'équipe.** Il a **deux parties** :
> **Partie 1 — Le schéma partagé** (comment définir la donnée dans `schema.prisma`) et
> **Partie 2 — Exposer un modèle via l'API** (le gabarit de module NestJS dto + service
> + controller + module, avec l'injection de `PrismaService`).
> Le `schema.prisma` est un fichier unique écrit à quatre mains : sans règles communes,
> chaque merge devient un conflit et la base un patchwork. `User` (déjà écrit) sert de
> modèle de référence pour le schéma, et `UsersModule` de gabarit pour l'API : copie-les.

---

## 1. Règles de nommage (figées)

| Élément | Règle | Exemple |
|---------|-------|---------|
| **Modèle** | PascalCase, **singulier** | `User`, `Board`, `ActivityEvent` |
| **Table** (`@@map`) | snake_case, **pluriel** | `users`, `boards`, `activity_events` |
| **Champ** | camelCase | `displayName`, `createdAt` |
| **Colonne** (`@map`) | snake_case, **uniquement si multi-mot** | `display_name`, `created_at` |
| **Enum** | PascalCase (nom) + UPPER_SNAKE (valeurs) | `enum Role { OWNER ADMIN MEMBER }` |
| **Champ de relation** | camelCase, singulier (to-one) / pluriel (to-many) | `owner`, `cards` |
| **Clé étrangère** | `<champRelation>Id` + `@map("<snake>_id")` | `ownerId @map("owner_id")` |

**Pourquoi ce double nommage (code camelCase / base snake_case) :** on garde des noms
agréables en TypeScript (`user.displayName`) tout en produisant une base au standard
SQL (`select display_name from users`), ce qui sert directement l'analytics de Am.

---

## 2. Clé primaire (figée)

Toujours, sur **chaque** modèle :

```prisma
id String @id @default(cuid())
```

- `cuid()` = identifiant court, unique, non devinable, sûr en URL.
- On **n'utilise pas** `autoincrement()` : pas d'ids séquentiels exposés, et pas de
  collision entre instances (important pour le temps réel / le distribué).

---

## 3. Horodatage (figé)

Sur **toute entité mutable**, ces deux champs, exactement :

```prisma
createdAt DateTime @default(now()) @map("created_at")
updatedAt DateTime @updatedAt      @map("updated_at")
```

`@default(now())` est posé par la base à l'insertion ; `@updatedAt` est mis à jour
automatiquement par Prisma à chaque modification.

---

## 4. Relations

- Côté « **plusieurs** » (celui qui porte la clé étrangère) : on met le champ scalaire
  `<relation>Id` **et** le champ objet avec `@relation`.
- Côté « **un** » : on met seulement le tableau (`Board[]`), **sans** attribut.
- On **déclare toujours** le comportement `onDelete` : ça force une décision explicite.
  - `Cascade` : supprime les enfants avec le parent (ex. les boards d'un user supprimé).
  - `SetNull` : détache (le champ FK doit alors être optionnel `?`).
  - `Restrict` : interdit la suppression du parent tant qu'il a des enfants.
- On ajoute un **index** `@@index([laCleEtrangere])` sur les FK qu'on interroge.
- On nomme une relation `@relation("Nom")` **seulement** en cas d'ambiguïté (plusieurs
  relations vers le même modèle, ex. `author` et `assignee` tous deux vers `User`).

---

## 5. Enums, unicité, index

```prisma
enum Role {
  OWNER
  ADMIN
  MEMBER
}
```

- Unicité d'un champ : `@unique`. Unicité combinée : `@@unique([orgId, userId])`.
- Index de lecture : `@@index([boardId])` sur les colonnes servant aux filtres/tri.
- Champ d'ordre (drag-and-drop) : on stocke une **position `String`** (stratégie
  LexoRank / fractional indexing), pas un entier — décision d'équipe déjà prise.

---

## 6. Guide pas-à-pas : ajouter un nouveau modèle

Exemple complet : Ai ajoute `Board`, possédé par un `User`.

### Étape 1 — Écrire le modèle (en respectant les sections 1 à 5)

```prisma
// Un tableau appartient a un utilisateur (relation plusieurs-a-un).
model Board {
  // PK figee.
  id        String   @id @default(cuid())

  // Un champ metier simple (un seul mot => pas de @map).
  title     String

  // Horodatage fige.
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt      @map("updated_at")

  // Cle etrangere scalaire : <relation>Id, mappee en snake_case.
  ownerId   String   @map("owner_id")
  // Champ de relation objet : relie ownerId a User.id.
  // onDelete: Cascade => supprimer le user supprime ses boards.
  owner     User     @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  // Index sur la FK : accelere "tous les boards d'un user".
  @@index([ownerId])
  // Table en snake_case pluriel.
  @@map("boards")
}
```

### Étape 2 — Ajouter la relation inverse sur `User`

Dans le modèle `User`, dans la zone « Relations », ajoute :

```prisma
// Cote "un" : la liste des boards possedes. Aucun attribut ici.
ownedBoards Board[]
```

> Sans ce champ inverse, Prisma refuse de valider : une relation a **toujours** deux côtés.

### Étape 3 — Appliquer à la base (dev)

On **pousse** le schéma : Prisma compare la base à `schema.prisma` et applique
directement la différence.

```bash
docker compose exec backend npx prisma db push
docker compose exec backend npx prisma generate
```

Ou simplement `make re` : l'entrypoint refait les deux au démarrage.

> **Ce qui se committe, c'est `schema.prisma`** — c'est lui la source de vérité.
> Il n'y a pas de dossier `prisma/migrations/` : l'équipe a fait le choix de
> `db push` (itération rapide, pas de conflits de merge sur les migrations).
>
> **Attention** : `db push` peut être destructeur. Renommer un champ supprime
> l'ancienne colonne **et ses données**, sans confirmation. En développement c'est
> sans gravité, mais ne compte pas sur la base pour garder tes données de test.
>
> Les coéquipiers n'ont ensuite qu'à faire `make up` : l'entrypoint pousse le schéma
> à jour au démarrage.


### Étape 4 — Vérifier

```bash
# Inspecter les tables/colonnes dans un navigateur
docker compose exec backend npx prisma studio
```

Vérifie que la table est bien `boards`, la colonne `owner_id`, l'index présent.

---

## 7. Cas many-to-many : table de jonction explicite

Pour une relation N-N qui **porte des données** (ex. le rôle d'un user dans une
organisation), on crée un modèle de jonction explicite — **jamais** la relation
implicite de Prisma.

```prisma
// Table de jonction User <-> Organization, portant un role.
model Membership {
  id     String @id @default(cuid())

  userId String @map("user_id")
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)

  orgId  String @map("org_id")
  org    Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)

  role   Role   @default(MEMBER)

  // Un user ne peut appartenir qu'une fois a une organisation.
  @@unique([userId, orgId])
  @@index([orgId])
  @@map("memberships")
}
```

Côté `User` : `memberships Membership[]`. Côté `Organization` : `memberships Membership[]`.

---

## 8. Checklist avant chaque PR touchant `schema.prisma`

- [ ] Modèle en PascalCase singulier + `@@map("snake_case_pluriel")`.
- [ ] `id String @id @default(cuid())`.
- [ ] `createdAt` / `updatedAt` présents et mappés (si entité mutable).
- [ ] Champs multi-mot mappés en snake_case via `@map`.
- [ ] Chaque relation a ses **deux** côtés, un `onDelete` explicite, un `@@index` sur la FK.
- [ ] `prisma db push` passe **et** `prisma generate` regénère sans erreur.
- [ ] `schema.prisma` est committé (c'est la source de vérité, il n'y a pas de migrations).
- [ ] Prévenir l'équipe si on touche un modèle partagé (surtout `User`).

---

## 9. Qui ajoute quoi (rappel)

| Membre | Modèles à venir |
|--------|-----------------|
| **Qu** | `Credential` (hash/OAuth), `Message` (chat) |
| **Ai** | `Organization`, `Board`, `List`, `Card`, `Notification`, `File` |
| **Am** | `Membership` / `Role`, `ActivityEvent` (event backbone), agrégats analytics |
| **Ny** | infra ORM (ce fichier, `PrismaService`), champs temps réel (positions LexoRank) |

> `User` est déjà écrit et sert de gabarit. Tout le reste se construit dessus.

---

# PARTIE 2 — Exposer un modèle via l'API (gabarit de module)

Un modèle dans `schema.prisma` ne fait que **définir la donnée**. Pour la lire ou
l'écrire depuis le front, on l'expose via un **module de feature** NestJS. Le gabarit
ci-dessous est déjà appliqué à `UsersModule` : copie-le pour chaque nouveau domaine.

## 10. Le gabarit : un dossier, quatre fichiers

Un domaine = un dossier dans `src/`, avec toujours la même structure :

```
src/users/
├── dto/
│   └── create-user.dto.ts   # la FORME des données d'entrée
├── users.service.ts         # la logique (parle à Prisma)
├── users.controller.ts      # les routes HTTP (mince, délègue)
└── users.module.ts          # assemble controller + service
```

Séparation des rôles à retenir : le **controller** reçoit et délègue (aucune logique),
le **service** fait le travail (et parle à Prisma), le **DTO** type l'entrée, le
**module** assemble le tout.

### Étape 1 — Le DTO (forme des entrées)

```ts
// La FORME attendue en entrée. Interface = typage à la COMPILATION seulement.
// Validation À L'EXÉCUTION (plus tard) : transformer en classe + class-validator + ValidationPipe.
export interface CreateUserDto {
  email: string        // @unique en base
  username: string     // @unique en base
  displayName: string
  avatarUrl?: string   // optionnel ("?")
}
```

### Étape 2 — Le service (logique + Prisma)

```ts
@Injectable()
export class UsersService {
  // Injection de PrismaService (voir la règle en section 11).
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    try {
      // INSERT réel ; id/createdAt/updatedAt remplis automatiquement.
      return await this.prisma.user.create({ data })
    } catch (error) {
      // P2002 = violation @unique -> on répond 409 au lieu d'un 500 opaque.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('email ou username déjà utilisé')
      }
      throw error
    }
  }

  findAll() {
    // SELECT trié du plus récent au plus ancien.
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
  }
}
```

### Étape 3 — Le controller (routes)

```ts
// '/users' + préfixe global 'api' => routes sous /api/users.
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Post()                          // POST /api/users
  create(@Body() dto: CreateUserDto) {   // @Body() = le JSON reçu
    return this.users.create(dto)
  }

  @Get()                           // GET /api/users
  findAll() {
    return this.users.findAll()
  }
}
```

### Étape 4 — Le module (assemblage)

```ts
@Module({
  controllers: [UsersController],
  // PrismaService n'est PAS ici : il vient du PrismaModule @Global (section 11).
  providers: [UsersService]
  // "exports: [UsersService]" seulement si un AUTRE module doit l'injecter.
})
export class UsersModule {}
```

### Étape 5 — Brancher dans `AppModule`

```ts
@Module({
  // Chaque module de feature s'ajoute ici pour activer ses routes.
  imports: [PrismaModule, UsersModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
```

### Étape 6 — Tester (à travers nginx)

```bash
# créer
curl -k -X POST https://localhost/api/users \
  -H "Content-Type: application/json" \
  -d '{"email":"a@42.fr","username":"a","displayName":"A"}'

# lister
curl -k https://localhost/api/users

# rejouer le même email -> 409 Conflict (le catch P2002 en action)
```

## 11. La règle d'injection de `PrismaService` (à retenir)

`PrismaModule` est déclaré `@Global` (section infra). Conséquence, pour utiliser la
base dans **n'importe quel** service de feature :

- On ajoute juste `PrismaService` au **constructeur** :
  ```ts
  constructor(private readonly prisma: PrismaService) {}
  ```
- On ne le déclare **jamais** dans les `providers` du module de feature (sinon on aurait
  deux instances et une confusion d'injection).
- On n'importe **pas** `PrismaModule` dans chaque module de feature : `@Global` s'en charge.

## 12. Checklist module (avant PR)

- [ ] Dossier `src/<feature>/` avec `dto/`, `service`, `controller`, `module`.
- [ ] Service : porte la logique et parle à Prisma ; controller mince (délègue).
- [ ] `PrismaService` injecté par le **constructeur**, **absent** des `providers`.
- [ ] Erreurs base traduites en HTTP clair (ex. `P2002` -> `ConflictException` 409).
- [ ] Module ajouté aux `imports` d'`AppModule`.
- [ ] Testé via `curl` (POST + GET) à travers nginx.
