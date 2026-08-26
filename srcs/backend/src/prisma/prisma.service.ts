// [CONCEPT: service Prisma] On enveloppe le client Prisma dans un service NestJS
// injectable. Ainsi, l'ORM se distribue via l'injection de dependance, comme AppService.

// Importe le decorateur @Injectable et deux hooks de cycle de vie de Nest.
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
// Importe le client genere par Prisma (c'est lui qui porte prisma.user, etc.).
import { PrismaClient } from '@prisma/client'

// Rend la classe injectable par Nest.
@Injectable()
// [CONCEPT: extends PrismaClient] Le service EST un PrismaClient : on herite de toutes
// ses methodes (create, findMany, count...). "implements" nous oblige a fournir les hooks.
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  // [CONCEPT: hook onModuleInit] Appele par Nest quand le module demarre.
  // On y ouvre la connexion a la base. Pourquoi ici : garantit une connexion prete
  // avant que les requetes n'arrivent (plutot qu'a la premiere requete).
  async onModuleInit() {
    // $connect etablit la connexion au pool PostgreSQL.
    await this.$connect()
  }

  // [CONCEPT: hook onModuleDestroy] Appele a l'arret de l'application.
  // On y ferme proprement la connexion. Pourquoi : eviter les connexions fantomes
  // cote base lors d'un redemarrage.
  async onModuleDestroy() {
    // $disconnect libere la connexion.
    await this.$disconnect()
  }
}
