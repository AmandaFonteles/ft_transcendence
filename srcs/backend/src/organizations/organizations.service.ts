import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { Role } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'


@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}
  async create(data: CreateOrganizationDto, creatorId: string) {
	return await this.prisma.organization.create({
  	  data: {
	    name: data.name,
		description: data.description,
		organizationMembers: {
  		  create: {
    		userId: creatorId,
    		role: Role.ADMIN
  		  }
		}
  	  }
	})
  }

  findAll() {
    return this.prisma.organization.findMany({ orderBy: { name: 'asc' } })
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id: id } })

    if (!organization) {
      throw new NotFoundException(`Organization with id ${id} not found`)//fr ?
    }

    return organization
  }
  
  async update(id: string, data: UpdateOrganizationDto) {
	if (data.name === undefined && data.description === undefined) {
	  throw new BadRequestException(`No data provided for update`)
	}
    await this.findOne(id)

    return await this.prisma.organization.update({ where: { id: id }, data: data })
  }

  async remove(id: string) {
	await this.findOne(id)
	return await this.prisma.organization.delete({ where: { id: id } })
  }

  async findMember(organizationId: string, userId: string) {
	await this.findOne(organizationId)
	const member = await this.prisma.organizationMember.findUnique({
	  where: {
		userId_organizationId: {
		  userId: userId,
		  organizationId: organizationId
		}
      }
	})
	if (!member) {
	  throw new NotFoundException(`User with id ${userId} is not a member of organization with id ${organizationId}`)
	}
	return member
  }
}