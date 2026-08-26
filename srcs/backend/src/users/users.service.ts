// [CONCEPT: service de feature] UsersService porte la logique du domaine "users".
// Il parle a PostgreSQL via PrismaService (injecte). Le controller, lui, restera mince.

import { ConflictException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateUserDto } from './dto/create-user.dto'

// AJOUT : constante placee ICI, HORS de la classe, juste apres les imports.
// [CONCEPT: constante partagee] Extrait la liste des champs "publics" d'un User
// (jamais le credential). Utilisee par findById ET updateAvatar : evite d'ecrire
// deux fois la meme liste et de risquer qu'elles divergent un jour.
const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true
} as const

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateUserDto) {
    try {
      return await this.prisma.user.create({ data })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('email ou username deja utilise')
      }
      throw error
    }
  }

  findAll() {
    return this.prisma.user.findMany({ orderBy: { createdAt: 'desc' } })
  }

  // [CONCEPT: select vs include] On utilise "select" (liste blanche des champs)
  // plutot que "include" : ca garantit que credential.passwordHash ne sort JAMAIS
  // de cette methode, meme si quelqu'un ajoute une relation plus tard par erreur.
  findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      // MODIFIE : on reutilise la constante au lieu de re-taper la liste des champs.
      select: USER_PUBLIC_SELECT
    })
  }

  // AJOUT : nouvelle methode, a la fin de la classe.
  // Change l'avatar du user connecte. Le controller aura deja verifie via
  // SelectAvatarDto (etape 3) que avatarUrl fait partie des presets autorises.
  updateAvatar(userId: string, avatarUrl: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: USER_PUBLIC_SELECT
    })
  }
}