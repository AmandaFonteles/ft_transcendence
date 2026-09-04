import { Injectable, InternalServerErrorException, BadRequestException, PayloadTooLargeException, OnModuleInit, NotFoundException, ForbiddenException } from '@nestjs/common'
import { Role, VisibilityPolicy } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { OrganizationsService } from '../organizations/organizations.service'
import { mkdir,writeFile, unlink, access } from 'fs/promises'
import { join, extname } from 'path'
import { WASMagic } from 'wasmagic'
import { randomUUID } from 'crypto'
import { CreateFileDto } from './dto/create-file.dto'
import { UpdateFileDto } from './dto/update-file.dto'

@Injectable()
export class FilesService implements OnModuleInit {
  private magic: WASMagic
  
  constructor(private readonly prisma: PrismaService, private readonly orgaServ: OrganizationsService) {}

  async onModuleInit() {
    this.magic = await WASMagic.create()
  }

  private async createOrganizationFolder(organizationId: string) {
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

  async uploadFile(data: CreateFileDto, organizationId: string, requesterId: string, file: Express.Multer.File) {
	if (!file) {
		throw new BadRequestException(`Aucun fichier n'a été fourni`)
	}
	if (file.size > 10 * 1024 * 1024) {
		throw new PayloadTooLargeException(`Le fichier est trop lourd`)
	}
	const allowedFileTypes : Record<string, string[]> =  {
  		'image/jpeg': ['.jpg', '.jpeg'],
  		'image/png': ['.png'],
  		'image/webp': ['.webp'],
  		'application/pdf': ['.pdf'],
		'text/plain': ['.txt'],
		'application/msword': ['.doc'],
		'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],

		'application/vnd.ms-excel': ['.xls'],
		'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],

		'application/vnd.ms-powerpoint': ['.ppt'],
		'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
	}
	const fileExtension = extname(file.originalname).toLowerCase()
	if (!allowedFileTypes[file.mimetype]?.includes(fileExtension)) {
		throw new BadRequestException(`Type de fichier non autorisé`)
	}
	const detectedMimeType = this.magic.detect(file.buffer)
	if (detectedMimeType !== file.mimetype) {
		throw new BadRequestException(`Le type MIME du fichier ne correspond pas à son contenu`)
	}
	const member = await this.orgaServ.requireActiveMember(organizationId, requesterId)
	const organizationPath = await this.createOrganizationFolder(organizationId)
	const generatedFileName = `${randomUUID()}${fileExtension}`
	const storagePath = join('organizations', organizationId, generatedFileName)
	const filePath = join(organizationPath, generatedFileName)
	try {
	  await writeFile(filePath, file.buffer)
	} catch {
	  throw new InternalServerErrorException(`Impossible d'enregistrer le fichier sur le disque`)
	}
	try {
	  const uploadedFile = await this.prisma.file.create({
	  	data: {
	  	  name: file.originalname,
	  	  description: data.description,
	  	  visibilityPolicy: data.visibilityPolicy,
	  	  mimeType: file.mimetype,
	  	  size: file.size,
	  	  storagePath: storagePath,
	  	  organizationId: organizationId,
	  	  ownerId: member.id
	  	}
	  })
	  return uploadedFile
	} catch {
	  try {
		await unlink(filePath)
	  } catch {
		// If the file deletion fails, we do not throw an exception to avoid masking the original error
	  }
	  throw new InternalServerErrorException(`Impossible d'enregistrer le fichier dans la base de données`)
	}
  }

  async findFileById(fileId: string, requesterId: string, organizationId: string) {
	const file = await this.prisma.file.findUnique({
	  where: {
		id: fileId,
		organizationId: organizationId
	  }
	})
	if (!file) {
	  throw new NotFoundException(`Le fichier ${fileId} n'existe pas`)
	}
	const member = await this.orgaServ.requireActiveMember(file.organizationId, requesterId)
	if (member.role === Role.ADMIN) {
	  return file
	}
	if (file.ownerId === member.id) {
	  return file
	}
	if (file.visibilityPolicy === 'ALL_MEMBERS') {
	  return file
	}
	if (file.visibilityPolicy === 'RESTRICTED') {
	  const fileAccess = await this.prisma.fileAccess.findUnique({
		where: {
		  fileId_memberId: {
			fileId: fileId,
			memberId: member.id
		  }
		}
	  })
	  if (fileAccess) {
	    return file
	   }
	}
	throw new ForbiddenException(`Accès au fichier refusé`)
  }

  async findAllFiles(organizationId: string, requesterId: string)
  {
	const member = await this.orgaServ.requireActiveMember(organizationId, requesterId)
	if (member.role === Role.ADMIN) {
		return await this.prisma.file.findMany({
		  where: {
			organizationId: organizationId
		  }
		})
	}
	const files = await this.prisma.file.findMany({
	  where: {
		organizationId: organizationId,
		OR: [
		  { ownerId: member.id },
		  { visibilityPolicy: 'ALL_MEMBERS' },
		  {
			AND: [
			  { visibilityPolicy: 'RESTRICTED' },
			  {
				fileAccesses: {
				  some: {
					memberId: member.id
				  }
				}
			  }
			]
		  }
		]
	  }
	})
	return files
  }

  private getFilePath(storagePath: string) {
	const uploadDir = process.env.UPLOAD_DIR
	if (uploadDir === undefined) {
	  throw new InternalServerErrorException(`La variable d'environnement UPLOAD_DIR n'est pas définie`)
	}
	const filePath = join(uploadDir, storagePath)
	return filePath
  }

  async downloadFile(fileId: string, requesterId: string, organizationId: string) {
	const file = await this.findFileById(fileId, requesterId, organizationId)
	const filePath = this.getFilePath(file.storagePath)
	try {
	  await access(filePath)
	} catch {
	  throw new NotFoundException(`Le fichier n'existe pas`)
	}
	return { filePath, fileName: file.name, mimeType: file.mimeType }
  }

  async previewFile(fileId: string, requesterId: string, organizationId: string) {
	const file = await this.findFileById(fileId, requesterId, organizationId)
	const previewableMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']
	if (!previewableMimeTypes.includes(file.mimeType)) {
		throw new BadRequestException(`Le type MIME du fichier n'est pas prévisualisable`)
	}
	const filePath = this.getFilePath(file.storagePath)
	try {
	  await access(filePath)
	} catch {
	  throw new NotFoundException(`Le fichier n'existe pas`)
	}
	return { filePath, fileName: file.name, mimeType: file.mimeType }
  }

  async updateFile(fileId: string, requesterId: string, organizationId: string, data: UpdateFileDto) {
	const file = await this.findFileById(fileId, requesterId, organizationId)
	const member = await this.orgaServ.requireActiveMember(organizationId, requesterId)
	if (member.role !== Role.ADMIN && file.ownerId !== member.id) {
		throw new ForbiddenException(`Vous n'avez pas la permission de modifier ce fichier`)
	}
	try {
		const updatedFile = await this.prisma.$transaction(async (prisma) => {
		  const update = await prisma.file.update({
		  where: { id: fileId },
		  data: {
		    name: data.name,
		    description: data.description,
		    visibilityPolicy: data.visibilityPolicy
	      }
	    })
	    if (file.visibilityPolicy === VisibilityPolicy.RESTRICTED && data.visibilityPolicy !== undefined && data.visibilityPolicy !== VisibilityPolicy.RESTRICTED) {
		  await prisma.fileAccess.deleteMany({
	        where: {
			  fileId: fileId
		    }
		  })
	    }
	    return update
	  })
	  return updatedFile
	} catch {
		throw new InternalServerErrorException(`Impossible de mettre à jour le fichier`)
	}
  }
}