import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  PayloadTooLargeException,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import * as argon2 from 'argon2'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { OrganizationsService } from '../organizations/organizations.service'
import { StorageService } from '../files/storage.service'
import { RESOURCE_ID_PATTERN } from '../common/validation'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'

// --- Avatars ----------------------------------------------------------------

// User.avatarUrl contient une URL publique, utilisable telle quelle dans un
// <img src> (le front n'y met pas d'en-tete Authorization). Elle est construite
// ici et nulle part ailleurs.
const AVATAR_URL_PREFIX = '/api/users/avatars'

function buildAvatarUrl(userId: string, filename: string): string {
  return `${AVATAR_URL_PREFIX}/${userId}/${filename}`
}

// Forme exacte d'un nom genere par uploadAvatar() : un UUID v4 suivi de ".png".
// Aucune saisie utilisateur n'y entre, voir resolveAvatarFilePath().
const AVATAR_FILENAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/

// --- Projection publique d'un User ------------------------------------------

// La relation "credential" a son propre select : seul twoFactorEnabled en sort,
// passwordHash et twoFactorSecret ne peuvent pas fuiter par accident.
const USER_PUBLIC_SELECT = {
  id: true,
  email: true,
  username: true,
  displayName: true,
  avatarUrl: true,
  createdAt: true,
  updatedAt: true,
  isOnline: true,
  credential: { select: { twoFactorEnabled: true } }
} as const

// Aplatit le booleen d'un cran : le front n'a pas a connaitre le modele
// Credential. credential vaut null pour un compte OAuth pur.
function toPublicUser<T extends { credential: { twoFactorEnabled: boolean } | null }>(
  user: T
): Omit<T, 'credential'> & { twoFactorEnabled: boolean } {
  const { credential, ...rest } = user
  return { ...rest, twoFactorEnabled: credential?.twoFactorEnabled ?? false }
}

// --- Service ----------------------------------------------------------------

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService,
              private readonly organizations: OrganizationsService,
              private readonly storage: StorageService) {}

  // L'adresse e-mail est volontairement absente de l'annuaire ; un findMany() nu
  // renverrait tous les champs du modele.
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

  // "select" plutot que "include" : garantit que credential.passwordHash ne sort
  // jamais, meme si une relation est ajoutee plus tard.
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: USER_PUBLIC_SELECT
    })
    // null si l'id n'existe pas : c'est le controller qui le traduit en 404.
    return user && toPublicUser(user)
  }

  // Le controller a deja verifie via SelectAvatarDto que l'URL fait partie des
  // presets autorises.
  async updateAvatar(userId: string, avatarUrl: string) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: USER_PUBLIC_SELECT
    })
    await this.storage.pruneAvatarFolder(userId)
    return toPublicUser(updatedUser)
  }

  // dto.email et dto.displayName peuvent etre undefined : Prisma ignore les cles
  // undefined dans "data", pas de filtrage manuel a faire.
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    try {
      const updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: {
          email: dto.email,
          displayName: dto.displayName
        },
        select: USER_PUBLIC_SELECT
      })
      return toPublicUser(updatedUser)
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('email deja utilise')
      }
      throw error
    }
  }

  // --- Mot de passe ---------------------------------------------------------

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const credential = await this.prisma.credential.findUnique({
      where: { userId }
    })

    // Compte OAuth pur : 403 et non 404, l'utilisateur existe bien.
    if (!credential) {
      throw new ForbiddenException(
        'ce compte est connecte via OAuth, aucun mot de passe a modifier'
      )
    }

    const isValid = await argon2.verify(credential.passwordHash, dto.currentPassword)
    if (!isValid) {
      throw new UnauthorizedException('mot de passe actuel incorrect')
    }

    const newHash = await argon2.hash(dto.newPassword)
    await this.prisma.credential.update({
      where: { userId },
      data: { passwordHash: newHash }
    })

    return { success: true }
  }

  async setOnlineStatus(userId: string, isOnline: boolean) {
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

  // --- Compte ---------------------------------------------------------------

  async deleteAccount(userId: string) {
    const organizationIdsToDelete = await this.organizations.checkOrganizationsAtUserDeletion(userId)
    for (const organizationId of organizationIdsToDelete) {
      await this.prisma.organization.delete({ where: { id: organizationId } })
      await this.storage.removeOrganizationFolder(organizationId)
    }
    await this.prisma.user.delete({ where: { id: userId } })
    await this.storage.removeAvatarFolder(userId)
    return { success: true }
  }

  // --- Televersement d'avatar -----------------------------------------------

  async uploadAvatar(userId: string, file: Express.Multer.File)
  {
    if (!file) {
      throw new BadRequestException(`Aucun fichier n'a été fourni`)
    }
    if (file.size > 5 * 1000000) {
      throw new PayloadTooLargeException(`Le fichier est trop lourd`)
    }
    const allowedFileType : Record<string, string[]> =  { 'image/png': ['.png'] }
    const fileExtension = extname(file.originalname).toLowerCase()
    if (!allowedFileType[file.mimetype]?.includes(fileExtension)) {
      throw new BadRequestException(`Type de fichier non autorisé`)
    }
	  const detectedMimeType = this.storage.detectMimeType(file.buffer)
	  if (detectedMimeType !== file.mimetype) {
		  throw new BadRequestException(`Le type MIME du fichier ne correspond pas à son contenu`)
	  }
    const avatarPath = await this.storage.createAvatarFolder(userId)
    const generatedFileName = `${randomUUID()}.png`
    const filePath = join(avatarPath, generatedFileName)
    await this.storage.writeFileToStorage(filePath, file.buffer)
    let updatedUser
    try {
        updatedUser = await this.prisma.user.update({
        where: { id: userId },
        data: { avatarUrl: buildAvatarUrl(userId, generatedFileName) },
        select: USER_PUBLIC_SELECT
      })
    } catch {
      // La base pointe toujours vers l'avatar precedent : on retire le fichier qu'on
      // vient d'ecrire, et lui seul.
      await this.storage.deleteFileFromStorage(filePath)
      throw new InternalServerErrorException(`Impossible de mettre a jour l'avatar dans la base de donnees`)
    }
    // La base pointe desormais vers le nouveau fichier : tout le reste du dossier
    // est un residu.
    await this.storage.pruneAvatarFolder(userId, generatedFileName)
    return toPublicUser(updatedUser)
  }

  // Route publique assemblant un chemin depuis deux parametres d'URL. Express les
  // decode, donc "..%2F..%2Fetc%2Fpasswd" arriverait ici en "../../etc/passwd" :
  // on valide la forme des deux morceaux avant de construire quoi que ce soit
  // (StorageService.getFilePath verifie en plus le chemin resolu).
  // 404 uniforme : un identifiant malforme et un fichier absent se ressemblent.
  async resolveAvatarFilePath(userId: string, filename: string) {
    if (!RESOURCE_ID_PATTERN.test(userId) || !AVATAR_FILENAME_PATTERN.test(filename)) {
      throw new NotFoundException(`Le fichier n'existe pas`)
    }
    const storagePath = `avatars/${userId}/${filename}`
    const filePath = this.storage.getFilePath(storagePath)
    await this.storage.checkFileExists(filePath)
    return filePath
  }
}
