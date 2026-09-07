// [CONCEPT: service de feature] UsersService porte la logique du domaine "users".
// Il parle a PostgreSQL via PrismaService (injecte). Le controller, lui, restera mince.

import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  PayloadTooLargeException,
  InternalServerErrorException,
  NotFoundException, // AJOUT
} from '@nestjs/common'
import { Prisma } from '@prisma/client'
import * as argon2 from 'argon2'
import { PrismaService } from '../prisma/prisma.service'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ChangePasswordDto } from './dto/change-password.dto'
import { OrganizationsService } from '../organizations/organizations.service' ////pour supp orga en meme temps que user
//AJOUTS AILEEN:
import { StorageService } from '../files/storage.service'
import { RESOURCE_ID_PATTERN } from '../common/validation'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'

// [CONCEPT: un seul endroit construit l'URL] La valeur stockee dans User.avatarUrl
// est une URL PUBLIQUE, directement utilisable dans une balise <img src> cote front
// (qui ne porte pas d'en-tete Authorization, d'ou la route de service publique).
// Elle est construite ICI et nulle part ailleurs : c'est la dispersion de cette
// construction qui avait laisse la base et le code de nettoyage diverger.
const AVATAR_URL_PREFIX = '/api/users/avatars'

function buildAvatarUrl(userId: string, filename: string): string {
  return `${AVATAR_URL_PREFIX}/${userId}/${filename}`
}

// Forme EXACTE d'un nom de fichier d'avatar tel que uploadAvatar() le genere :
// un UUID v4 suivi de ".png". Aucune saisie utilisateur n'entre dans ce nom, donc
// on peut se permettre d'etre aussi strict — et on doit l'etre, voir
// resolveAvatarFilePath().
const AVATAR_FILENAME_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/
// AJOUT : constante placee ICI, HORS de la classe, juste apres les imports.
// [CONCEPT: constante partagee] Extrait la liste des champs "publics" d'un User.
// Utilisee par findById, updateAvatar, updateProfile ET uploadAvatar : evite
// d'ecrire quatre fois la meme liste et de risquer qu'elles divergent un jour.
//
// [SECURITE] La relation "credential" est incluse mais avec son PROPRE select :
// SEUL le booleen twoFactorEnabled en sort. Ni passwordHash ni twoFactorSecret
// ne peuvent fuiter, meme par accident : ils ne sont simplement pas selectionnes.
// Pourquoi exposer ce booleen : sans lui, le front ne sait pas si la 2FA est
// active et affichait "Activer" a quelqu'un qui l'a deja activee.
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

// [CONCEPT: aplatissement de la reponse] Le front n'a pas a connaitre le modele
// Credential : c'est un detail de notre schema. On remonte donc le booleen d'un
// cran pour renvoyer un objet PLAT { ..., twoFactorEnabled }.
// credential vaut null pour un compte cree via OAuth (il n'a pas de mot de passe,
// donc pas de 2FA possible) : on retombe alors sur false.
function toPublicUser<T extends { credential: { twoFactorEnabled: boolean } | null }>(
  user: T
): Omit<T, 'credential'> & { twoFactorEnabled: boolean } {
  const { credential, ...rest } = user
  return { ...rest, twoFactorEnabled: credential?.twoFactorEnabled ?? false }
}

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService,
              private readonly organizations: OrganizationsService,
              private readonly storage: StorageService) {}

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
  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      // MODIFIE : on reutilise la constante au lieu de re-taper la liste des champs.
      select: USER_PUBLIC_SELECT
    })
    // findUnique renvoie null si l'id n'existe pas : on le propage tel quel,
    // c'est le controller qui traduit ce null en 404.
    return user && toPublicUser(user)
  }

  // AJOUT : nouvelle methode, a la fin de la classe.
  // Change l'avatar du user connecte. Le controller aura deja verifie via
  // SelectAvatarDto (etape 3) que avatarUrl fait partie des presets autorises.
  async updateAvatar(userId: string, avatarUrl: string) {
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: USER_PUBLIC_SELECT
    })
    // L'utilisateur repasse sur un avatar predefini : ses fichiers televerses ne
    // servent plus a rien, on vide son dossier. Nettoyage APRES la mise a jour :
    // si celle-ci echouait, la base pointerait toujours vers un fichier qu'on
    // aurait deja supprime.
    // Les presets, eux, ne sont pas concernes : ils sont servis en statique par le
    // front (public/avatars/), pas depuis le volume de televersement.
    await this.storage.pruneAvatarFolder(userId)
    return toPublicUser(updatedUser)
  }

  // AJOUT : met a jour displayName et/ou email. dto.email et dto.displayName
  // peuvent etre undefined (DTO tout-optionnel) : Prisma ignore simplement
  // les cles undefined dans "data", donc pas besoin de filtrage manuel ici.
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
      await this.storage.removeOrganizationFolder(organizationId) // Supprime les fichiers de l'organisation
    }
    await this.prisma.user.delete({ where: { id: userId } })
    await this.storage.removeAvatarFolder(userId) // Supprime les fichiers de l'utilisateur
    return { success: true }
  }

  async uploadAvatar(userId: string, file: Express.Multer.File)
  {
    if (!file) {
      throw new BadRequestException(`Aucun fichier n'a été fourni`)
    }
    if (file.size > 5 * 1024 * 1024) {
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
      // La base n'a pas ete mise a jour : elle pointe toujours vers l'avatar
      // precedent. On retire donc le fichier qu'on vient d'ecrire, et LUI SEUL.
      await this.storage.deleteFileFromStorage(filePath)
      throw new InternalServerErrorException(`Impossible de mettre a jour l'avatar dans la base de donnees`)
    }
    // La base pointe desormais vers le nouveau fichier : tout autre fichier du
    // dossier est un residu. On les supprime en une passe plutot que de traquer
    // "l'ancien" — voir StorageService.pruneAvatarFolder pour le raisonnement.
    await this.storage.pruneAvatarFolder(userId, generatedFileName)
    return toPublicUser(updatedUser)
  }

  // [SECURITE : traversee de chemin] Cette methode assemble un chemin de fichier a
  // partir de DEUX parametres d'URL (GET /api/users/avatars/:userId/:filename), sur
  // une route PUBLIQUE, sans garde d'authentification — une image doit pouvoir
  // s'afficher dans une balise <img>, qui ne porte pas d'en-tete Authorization.
  //
  // Express decode les parametres d'URL : un client qui demande
  // ".../avatars/x/..%2F..%2F..%2Fetc%2Fpasswd" fait arriver "../../../etc/passwd"
  // dans "filename". Sans verification, le fichier lu sortait du dossier de
  // televersement — n'importe qui pouvait lire n'importe quel fichier du conteneur.
  //
  // On valide donc la FORME des deux morceaux avant de construire quoi que ce soit.
  // Ils ne sont pas "du texte libre" : l'un est un cuid genere par Prisma, l'autre
  // un UUID genere par nous. Tout le reste est refuse.
  // (StorageService.getFilePath verifie en plus que le chemin resolu reste dans le
  // dossier autorise : deux gardes independantes, aucune ne dependant de l'autre.)
  //
  // Reponse volontairement uniforme en 404 : un identifiant malforme et un fichier
  // absent donnent la meme reponse, on ne renseigne pas sur ce qui existe.
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
