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

  // Lit le type reel depuis le contenu, pas depuis le nom ni l'en-tete declare.
  detectMimeType(buffer: Buffer) {
  	return this.magic.detect(buffer)
  }

  // Garde anti-traversee de chemin : le chemin resolu doit rester sous UPLOAD_DIR.
  // Independante des validations de forme faites par les appelants.
  getFilePath(storagePath: string) {
  	const uploadDir = process.env.UPLOAD_DIR
  	if (uploadDir === undefined) {
      throw new InternalServerErrorException(`La variable d'environnement UPLOAD_DIR n'est pas définie`)
  	}
  	const rootDir = resolve(uploadDir)
  	const filePath = resolve(rootDir, storagePath)
  	if (filePath !== rootDir && !filePath.startsWith(rootDir + sep)) {
      throw new ForbiddenException(`Chemin de fichier invalide`)
  	}
  	return filePath
  }

  // --- Fichiers de projet ---------------------------------------------------

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

  // Echec silencieux volontaire : un fichier deja absent est le resultat voulu.
  async deleteFileFromStorage(filePath: string) {
	try {
	  await unlink(filePath)
	} catch {
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
	  }
  }

  // --- Avatars --------------------------------------------------------------

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

  // Vide le dossier d'avatars sauf le fichier a conserver : plus sur que de
  // traquer "l'ancien", qui laissait des residus quand un envoi echouait a mi-chemin.
  async pruneAvatarFolder(userId: string, keepFilename?: string) {
    let avatarPath: string
    try {
      avatarPath = this.getFilePath(join('avatars', userId))
    } catch {
      return
    }

    let entries: string[]
    try {
      entries = await readdir(avatarPath)
    } catch {
      return
    }

    await Promise.all(
      entries
        .filter((name) => name !== keepFilename)
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
	}
  }
}