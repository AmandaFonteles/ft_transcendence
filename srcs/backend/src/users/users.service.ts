// [CONCEPT: service de feature] UsersService porte la logique du domaine "users".
// Il parle a PostgreSQL via PrismaService (injecte). Le controller, lui, restera mince.

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import * as argon2 from 'argon2'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { OrganizationsService } from '../organizations/organizations.service' ////pour supp orga en meme temps que user
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
  updatedAt: true,
  isOnline: true
} as const

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService,
              private readonly organizations: OrganizationsService) {}

  // [CONCEPT: liste blanche de champs] "select" enumere explicitement ce qui sort.
  // L'ADRESSE E-MAIL EST VOLONTAIREMENT ABSENTE : c'est une donnee personnelle, et
  // l'annuaire n'a pas besoin d'elle pour fonctionner. Un "findMany()" nu renverrait
  // tous les champs du modele, e-mail compris, a chaque appel.
  findAll() {
    return this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        username: true,
        displayName: true,
        avatarUrl: true,
        createdAt: true,
      },
    })
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

  // AJOUT : met a jour displayName et/ou email. dto.email et dto.displayName
  // peuvent etre undefined (DTO tout-optionnel) : Prisma ignore simplement
  // les cles undefined dans "data", donc pas besoin de filtrage manuel ici.
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: {
          email: dto.email,
          displayName: dto.displayName
        },
        select: USER_PUBLIC_SELECT
      })
    } catch (error) {
      // Meme logique que create() : P2002 sur "email" => quelqu'un d'autre l'a deja.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('email deja utilise')
      }
      throw error
    }
  }

  // AJOUT : change le mot de passe apres avoir revérifié l'ancien.
  async changePassword(userId: string, dto: ChangePasswordDto) {
    // On recupere le Credential lie a ce user (pas garanti d'exister : un compte
    // cree via OAuth pur n'en a pas).
    const credential = await this.prisma.credential.findUnique({
      where: { userId }
    })

    // [CONCEPT: compte OAuth pur] Pas de Credential => pas de mot de passe a changer.
    // ForbiddenException => 403 : la requete est comprise mais l'action est refusee,
    // contrairement a un 404 qui suggererait "utilisateur introuvable" (faux ici).
    if (!credential) {
      throw new ForbiddenException(
        'ce compte est connecte via OAuth, aucun mot de passe a modifier'
      )
    }

    // Reverifie l'ancien mot de passe AVANT toute ecriture.
    const isValid = await argon2.verify(credential.passwordHash, dto.currentPassword)
    if (!isValid) {
      throw new UnauthorizedException('mot de passe actuel incorrect')
    }

    const newHash = await argon2.hash(dto.newPassword)
    await this.prisma.credential.update({
      where: { userId },
      data: { passwordHash: newHash }
    })

    // Pas besoin de renvoyer le user complet : le mot de passe n'apparait dans
    // aucun champ visible. Un simple accuse de reception suffit.
    return { success: true }
  }

  async setOnlineStatus(userId: string, isOnline: boolean) { //// supp compte
    try {
      return await this.prisma.user.update({
        where: { id: userId },
        data: { isOnline },
        select: { id: true, isOnline: true },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        return null
      }
      throw error
    }
  }

  async deleteAccount(userId: string) { // delete account & orga
    const organizationIdsToDelete = await this.organizations.checkOrganizationsAtUserDeletion(userId)
    for (const organizationId of organizationIdsToDelete) {
      await this.prisma.organization.delete({ where: { id: organizationId } })
    }
    await this.prisma.user.delete({ where: { id: userId } })
    return { success: true }
  }
}
