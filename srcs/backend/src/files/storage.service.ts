import { Injectable, InternalServerErrorException, BadRequestException, PayloadTooLargeException, OnModuleInit, NotFoundException, ForbiddenException } from '@nestjs/common'
import { join, resolve, sep } from 'path'
import { mkdir,writeFile, unlink, access, rm, readdir } from 'fs/promises'
import { WASMagic } from 'wasmagic'

@Injectable()
export class StorageService implements OnModuleInit {
  private magic: WASMagic

  async onModuleInit() {
    this.magic = await WASMagic.create()
  }

  detectMimeType(buffer: Buffer) {
  	return this.magic.detect(buffer)
  }

  // [SECURITE : traversee de chemin] Cette methode transforme un chemin RELATIF
  // (venant de la base, ou construit a partir de parametres d'URL) en chemin
  // absolu sur le disque. C'est exactement le point ou une valeur du type
  // "../../../../etc/passwd" devient dangereuse : join() ne se contente pas de
  // concatener, il NORMALISE — les ".." remontent reellement l'arborescence et le
  // resultat sort du dossier de televersement.
  //
  // On verifie donc que le chemin resolu reste SOUS le dossier autorise. Le test
  // est fait ici, au point de construction, et pas seulement chez les appelants :
  // une garde a l'entree protege l'appelant du jour, une garde ici protege aussi
  // celui que quelqu'un ecrira dans six mois.
  getFilePath(storagePath: string) {
  	const uploadDir = process.env.UPLOAD_DIR
  	if (uploadDir === undefined) {
      throw new InternalServerErrorException(`La variable d'environnement UPLOAD_DIR n'est pas définie`)
  	}
  	// resolve() rend les deux chemins absolus et normalises, condition necessaire
  	// pour que la comparaison de prefixe ci-dessous ait un sens.
  	const rootDir = resolve(uploadDir)
  	const filePath = resolve(rootDir, storagePath)
  	// Le separateur final est indispensable : sans lui, "/var/lib/uploads-autre"
  	// passerait le test en tant que prefixe de "/var/lib/uploads".
  	if (filePath !== rootDir && !filePath.startsWith(rootDir + sep)) {
      throw new ForbiddenException(`Chemin de fichier invalide`)
  	}
  	return filePath
  }

  async createOrganizationFolder(organizationId: string) {
  const uploadDir = process.env.UPLOAD_DIR
  if (uploadDir === undefined) {
    throw new InternalServerErrorException(`La variable d'environnement UPLOAD_DIR n'est pas définie`)
  }
  const organizationPath = join(uploadDir, 'organizations', organizationId)
  try {
  	await mkdir(organizationPath, { recursive: true })
  } catch {
  	throw new InternalServerErrorException(`Impossible de créer le dossier contenant les fichiers du projet`)
  }
  return organizationPath
  }

  async writeFileToStorage(filePath: string, buffer: Buffer) {
	try {
	  await writeFile(filePath, buffer)
	} catch {
	  throw new InternalServerErrorException(`Impossible d'enregistrer le fichier sur le disque`)
	}
  }

  async deleteFileFromStorage(filePath: string) {
	try {
	  await unlink(filePath)
	} catch {
	  // If the file deletion fails, we do not throw an exception to avoid masking the original error
	}
  }

  async checkFileExists(filePath: string) {
	try {
	  await access(filePath)
	} catch {
	  throw new NotFoundException(`Le fichier n'existe pas`)
	}
  }

  async removeOrganizationFolder(organizationId: string) {
	  const uploadDir = process.env.UPLOAD_DIR
	  if (uploadDir === undefined) {
		return
	  }
	  const organizationPath = join(uploadDir, 'organizations', organizationId)
	  try {
		await rm(organizationPath, { recursive: true, force: true })
	  } catch {
		// on ne veut pas empecher la suppression de l'orga si la suppression du volume echoue
	  }
  }

  async createAvatarFolder(userId: string)
  {
	const uploadDir = process.env.UPLOAD_DIR
	if (uploadDir === undefined) {
	  throw new InternalServerErrorException(`La variable d'environnement UPLOAD_DIR n'est pas définie`)
	}
	const avatarPath = join(uploadDir, 'avatars', userId)
	try {
	  await mkdir(avatarPath, { recursive: true })
	} catch {
	  throw new InternalServerErrorException(`Impossible de créer le dossier contenant les avatars des utilisateurs`)
	}
	return avatarPath
  }

  // [CONCEPT: invariant plutot que suivi] Ne garde dans le dossier d'avatars d'un
  // utilisateur QUE le fichier passe en parametre, et supprime tout le reste.
  //
  // Pourquoi cette forme, plutot que "supprimer l'ancien fichier apres avoir
  // enregistre le nouveau" : suivre l'ancien chemin oblige a le RECONSTRUIRE a
  // partir de la valeur stockee en base, et c'est precisement ce qui s'etait
  // casse — la base a commence a stocker une URL publique
  // ("/api/users/avatars/...") alors que le code qui la relisait attendait
  // encore un chemin de stockage ("avatars/..."). La comparaison echouait en
  // silence, donc plus aucun ancien avatar n'etait supprime.
  //
  // Ici on n'a rien a suivre : on retablit un INVARIANT — "un utilisateur a au
  // plus un fichier d'avatar sur le disque". Consequence utile : le nettoyage
  // rattrape aussi les fichiers deja accumules par le passe, et un televersement
  // interrompu a mi-chemin ne laisse pas de trace durable.
  //
  // keepFilename absent = on vide le dossier : c'est le cas du choix d'un avatar
  // predefini, ou l'utilisateur n'a plus aucun fichier a lui.
  async pruneAvatarFolder(userId: string, keepFilename?: string) {
    let avatarPath: string
    try {
      // Passe par getFilePath : on herite de sa verification de confinement, meme
      // si userId vient ici du jeton verifie et non d'une saisie.
      avatarPath = this.getFilePath(join('avatars', userId))
    } catch {
      return
    }

    let entries: string[]
    try {
      entries = await readdir(avatarPath)
    } catch {
      // Dossier inexistant : l'utilisateur n'a jamais televerse d'avatar.
      // Ce n'est pas une erreur, il n'y a simplement rien a nettoyer.
      return
    }

    await Promise.all(
      entries
        .filter((name) => name !== keepFilename)
        // deleteFileFromStorage n'echoue jamais : un fichier deja disparu ne doit
        // pas faire echouer le changement d'avatar, qui, lui, a reussi.
        .map((name) => this.deleteFileFromStorage(join(avatarPath, name))),
    )
  }

  async removeAvatarFolder(userId: string) {
	const uploadDir = process.env.UPLOAD_DIR
	if (uploadDir === undefined) {
	  return
	}
	const avatarPath = join(uploadDir, 'avatars', userId)
	try {
	  await rm(avatarPath, { recursive: true, force: true })
	} catch {
	  // on ne veut pas empecher la suppression du compte si la suppression du volume echoue
	}
  }
}