import { Injectable, InternalServerErrorException, BadRequestException, PayloadTooLargeException, NotFoundException, ForbiddenException } from '@nestjs/common'
import { Role, VisibilityPolicy } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { OrganizationsService } from '../organizations/organizations.service'
import { StorageService } from './storage.service'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { CreateFileDto } from './dto/create-file.dto'
import { UpdateFileDto } from './dto/update-file.dto'

@Injectable()
export class FilesService {

  constructor(private readonly prisma: PrismaService, private readonly orgaServ: OrganizationsService, private readonly storage: StorageService) {}

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
<<<<<<< HEAD
	const detectedMimeType = this.storage.detectMimeType(file.buffer)
=======
	const detectedMimeType = this.magic.detect(file.buffer)
>>>>>>> b0bd0ad (Aileen: add Quentin's friendship files + all started FileUpload)
	if (detectedMimeType !== file.mimetype) {
		throw new BadRequestException(`Le type MIME du fichier ne correspond pas à son contenu`)
	}
	const member = await this.orgaServ.requireActiveMember(organizationId, requesterId)
	const organizationPath = await this.storage.createOrganizationFolder(organizationId)
	const generatedFileName = `${randomUUID()}${fileExtension}`
	const storagePath = join('organizations', organizationId, generatedFileName)
	const filePath = join(organizationPath, generatedFileName)
	await this.storage.writeFileToStorage(filePath, file.buffer)
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
	  await this.storage.deleteFileFromStorage(filePath)
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


  async downloadFile(fileId: string, requesterId: string, organizationId: string) {
	const file = await this.findFileById(fileId, requesterId, organizationId)
	const filePath = this.storage.getFilePath(file.storagePath)
	await this.storage.checkFileExists(filePath)
	return { filePath, fileName: file.name, mimeType: file.mimeType }
  }

  async previewFile(fileId: string, requesterId: string, organizationId: string) {
	const file = await this.findFileById(fileId, requesterId, organizationId)
	const previewableMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'text/plain']
	if (!previewableMimeTypes.includes(file.mimeType)) {
		throw new BadRequestException(`Le type MIME du fichier n'est pas prévisualisable`)
	}
	const filePath = this.storage.getFilePath(file.storagePath)
	await this.storage.checkFileExists(filePath)
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

  private async findFileAccessForMember(fileId: string, memberId: string) {
	return await this.prisma.fileAccess.findUnique({
	  where: {
		fileId_memberId: {
		  fileId,
		  memberId
		}
	  }
	})
  }

  async addFileAccess(fileId: string, targetUserId: string, requesterId: string, organizationId: string) {
	const file = await this.findFileById(fileId, requesterId, organizationId)
	if (file.visibilityPolicy !== VisibilityPolicy.RESTRICTED) {
		throw new BadRequestException(`Le fichier n'a pas une politique de visibilité restreinte`)
	}
	const member = await this.orgaServ.requireActiveMember(organizationId, requesterId)
	if (member.role !== Role.ADMIN && file.ownerId !== member.id) {
		throw new ForbiddenException(`Vous n'avez pas la permission d'ajouter un accès à ce fichier`)
	}
	const targetMember = await this.orgaServ.requireActiveMember(organizationId, targetUserId)
	const existingAccess = await this.findFileAccessForMember(fileId, targetMember.id)
	if (existingAccess !== null || targetMember.id === file.ownerId) {
		throw new BadRequestException(`L'accès au fichier pour ce membre existe déjà`)
	}
	const fileAccess = await this.prisma.fileAccess.create({
	  data: {
	    fileId: fileId,
	    memberId: targetMember.id
	  }
	})
	return fileAccess
  }

  async removeFileAccess(fileId: string, targetUserId: string, requesterId: string, organizationId: string) {
	const file = await this.findFileById(fileId, requesterId, organizationId)
	if (file.visibilityPolicy !== VisibilityPolicy.RESTRICTED) {
		throw new BadRequestException(`Le fichier n'a pas une politique de visibilité restreinte`)
	}
	const member = await this.orgaServ.requireActiveMember(organizationId, requesterId)
	if (member.role !== Role.ADMIN && file.ownerId !== member.id) {
		throw new ForbiddenException(`Vous n'avez pas la permission de supprimer un accès à ce fichier`)
	}
	const targetMember = await this.orgaServ.findMember(organizationId, targetUserId)
	const existingAccess = await this.findFileAccessForMember(fileId, targetMember.id)
	if (existingAccess === null) {
		throw new NotFoundException(`L'accès au fichier pour ce membre n'existe pas`)
	}
	await this.prisma.fileAccess.delete({
	  where: {
		fileId_memberId: {
		  fileId: fileId,
		  memberId: targetMember.id
		}
	  }
	})
  }

  async removeFile(fileId: string, requesterId: string, organizationId: string) {
	const member = await this.orgaServ.requireActiveMember(organizationId, requesterId)
	const file = await this.findFileById(fileId, requesterId, organizationId)
	if (member.role !== Role.ADMIN && file.ownerId !== member.id) {
		throw new ForbiddenException(`Vous n'avez pas la permission de supprimer ce fichier`)
	}
	const filePath = this.storage.getFilePath(file.storagePath)
	try {
	  await this.prisma.file.delete({
		where: { id: fileId }
	  })
	} catch {
	  throw new InternalServerErrorException(`Impossible de supprimer le fichier de la base de données`)
	}
	await this.storage.deleteFileFromStorage(filePath)
  }
}
