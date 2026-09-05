import { Injectable, InternalServerErrorException, BadRequestException, PayloadTooLargeException, OnModuleInit, NotFoundException, ForbiddenException } from '@nestjs/common'
import { join } from 'path'
import { mkdir,writeFile, unlink, access, rm } from 'fs/promises'
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

  getFilePath(storagePath: string) {
  	const uploadDir = process.env.UPLOAD_DIR
  	if (uploadDir === undefined) {
      throw new InternalServerErrorException(`La variable d'environnement UPLOAD_DIR n'est pas définie`)
  	}
  	const filePath = join(uploadDir, storagePath)
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
}