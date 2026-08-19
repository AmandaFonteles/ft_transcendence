// [CONCEPT: service de feature] UsersService porte la logique du domaine "users".
// Il parle a PostgreSQL via PrismaService (injecte). Le controller, lui, restera mince.

// Importe @Injectable (rend la classe injectable) et ConflictException (erreur HTTP 409).
import { ConflictException, Injectable } from '@nestjs/common'
// Importe le namespace Prisma : il porte les types d'erreurs (PrismaClientKnownRequestError).
import { Prisma } from '@prisma/client'
// Importe le service Prisma (disponible partout car PrismaModule est @Global).
import { PrismaService } from '../prisma/prisma.service'
// Importe le type d'entree partage.
import { CreateUserDto } from './dto/create-user.dto'

// Rend la classe injectable par Nest.
@Injectable()
export class UsersService {
  // [CONCEPT: injection de dependance] On demande PrismaService dans le constructeur ;
  // Nest fournit l'instance partagee. On ne fait jamais "new PrismaService()".
  constructor(private readonly prisma: PrismaService) {}

  // Cree un utilisateur. Asynchrone car l'ecriture en base renvoie une Promesse.
  async create(data: CreateUserDto) {
    // try/catch : on veut transformer une erreur base "brute" en reponse HTTP claire.
    try {
      // INSERT reel. id / createdAt / updatedAt sont remplis automatiquement (voir schema.prisma).
      // "await" ici (et pas seulement "return") pour que l'erreur remonte DANS le try.
      return await this.prisma.user.create({ data })
    } catch (error) {
      // [CONCEPT: erreur Prisma typee] P2002 = violation d'une contrainte @unique
      // (email ou username deja pris). On la traduit en 409 plutot qu'un 500 opaque.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        // ConflictException => Nest repond automatiquement avec le code HTTP 409 Conflict.
        throw new ConflictException('email ou username deja utilise')
      }
      // Toute autre erreur est relancee telle quelle (Nest renverra un 500).
      throw error
    }
  }

  // Renvoie tous les utilisateurs, du plus recent au plus ancien.
  findAll() {
    // findMany sans filtre = SELECT * ; orderBy trie par date de creation decroissante.
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
  }
}
