import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
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

  findAll(requesterUserId: string) {
    return this.prisma.organization.findMany({ 
	  orderBy: { name: 'asc' }, 
	  where: { 
		organizationMembers: {
	      some: { 
			userId: requesterUserId, 
	        leftAt: null 
		  } 
		} 
	  } 
	})
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id: id } })

    if (!organization) {
      throw new NotFoundException(`Organization with id ${id} not found`)//fr ?
    }

    return organization
  }

  async findOneForMember(organizationId: string, requesterUserId: string) {
    const organization = await this.findOne(organizationId)
	await this.requireActiveMember(organizationId, requesterUserId)
	return organization
  }

  async update(organizationId: string, requesterUserId: string, data: UpdateOrganizationDto) {
	if (data.name === undefined && data.description === undefined) {
	  throw new BadRequestException(`No data provided for update`)
	}
    await this.requireAdmin(organizationId, requesterUserId)
    return await this.prisma.organization.update({ where: { id: organizationId }, data: data })
  }

  async remove(organizationId: string, requesterUserId: string) {
	await this.requireAdmin(organizationId, requesterUserId)
	return await this.prisma.organization.delete({ where: { id: organizationId } })
  }

  async findMembershipRecord(organizationId: string, userId: string) {
     const membershipRecord = await this.prisma.organizationMember.findUnique({
	  where: {
		userId_organizationId: {
		  userId: userId,
		  organizationId: organizationId
		}
      }
	})
	return membershipRecord
  }

  async findMember(organizationId: string, userId: string) {
	await this.findOne(organizationId)
	const member = await this.findMembershipRecord(organizationId, userId)
	if (!member) {
	  throw new NotFoundException(`User with id ${userId} is not a member of organization with id ${organizationId}`)
	}
	return member
  }

  async findActiveMember(organizationId: string, userId: string) {
    await this.findOne(organizationId)
	const member = await this.findMembershipRecord(organizationId, userId)
	if (!member || member.leftAt !== null) {
	  return null
	}
	return member
  }

  async findInactiveMember(organizationId: string, userId: string) {
	await this.findOne(organizationId)
	const member = await this.findMembershipRecord(organizationId, userId)
	if (!member || member.leftAt === null) {
	  return null
	}
	return member
  }//utile ? 

  async addMember(organizationId: string, targetUserId: string, requesterUserId: string) {
	await this.findOneForMember(organizationId, requesterUserId)
	// await this.requireAdmin(organizationId, requesterUserId)
	const existingMember = await this.findMembershipRecord(organizationId, targetUserId)
	if (existingMember) {
	  if (existingMember.leftAt === null) {
		throw new BadRequestException(`User with id ${targetUserId} is already an active member of organization with id ${organizationId}`)
	  } else {
		return await this.prisma.organizationMember.update({
		  where: { userId_organizationId: { userId: targetUserId, organizationId: organizationId } },
		  data: { leftAt: null }
		})
	  }
	}
	return await this.prisma.organizationMember.create({
	  data: {
		userId: targetUserId,
		organizationId: organizationId,
		role: Role.MEMBER
	  }
	})
  }

  async countActiveAdmins(organizationId: string) {
    const count = await this.prisma.organizationMember.count({
	  where: {
		organizationId: organizationId,
		role: Role.ADMIN,
		leftAt: null
	  }
	})
	return count
  }

  async countActiveMembers(organizationId: string) {
    const count = await this.prisma.organizationMember.count({
	  where: {
		organizationId: organizationId,
		leftAt: null
	  }
	})
	return count
  }

  async leaveOrganization(organizationId: string, userId: string) {
    const member = await this.requireActiveMember(organizationId, userId)
	const activeMembersCount = await this.countActiveMembers(organizationId)
	if (member.role === Role.ADMIN && await this.countActiveAdmins(organizationId) <= 1 && activeMembersCount > 1) {
	  throw new BadRequestException(`Cannot leave organization with id ${organizationId} as the last admin`)
	} 
	if (activeMembersCount === 1) {
	  return await this.prisma.organization.delete({ where: { id: organizationId } })
	}
	return await this.prisma.organizationMember.update({
      where: { userId_organizationId: { userId: userId, organizationId: organizationId } },
      data: { leftAt: new Date(), role: Role.MEMBER }
    })
  }

  async requireActiveMember(organizationId: string, userId: string) {
	const member = await this.findActiveMember(organizationId, userId)
	if (!member) {
	  throw new ForbiddenException(`User with id ${userId} is not an active member of organization with id ${organizationId}`)
	}
	return member
  }

  async requireAdmin(organizationId: string, userId: string) {
    const member = await this.requireActiveMember(organizationId, userId)
    if (member.role !== Role.ADMIN) {
      throw new ForbiddenException(`User with id ${userId} is not an admin of organization with id ${organizationId}`)
    }
    return member
  }

  async promoteMember(organizationId: string, targetUserId: string, requesterUserId: string) {
    await this.requireAdmin(organizationId, requesterUserId)
	const member = await this.requireActiveMember(organizationId, targetUserId)
	if (member.role === Role.ADMIN) {
	  throw new BadRequestException(`User with id ${targetUserId} is already an admin of organization with id ${organizationId}`)
	}
	return await this.prisma.organizationMember.update({
	  where: { userId_organizationId: { userId: targetUserId, organizationId: organizationId } },
	  data: { role: Role.ADMIN }
	})
  }

  async demoteMember(organizationId: string, targetUserId: string, requesterUserId: string) {
	await this.requireAdmin(organizationId, requesterUserId)
	const member = await this.requireActiveMember(organizationId, targetUserId)
	if (member.role !== Role.ADMIN) {
	  throw new BadRequestException(`User with id ${targetUserId} is not an admin of organization with id ${organizationId}`)
	}
	if (await this.countActiveAdmins(organizationId) <= 1) {
	  throw new BadRequestException(`Cannot demote the last admin of organization with id ${organizationId}`)
	}
	return await this.prisma.organizationMember.update({
	  where: { userId_organizationId: { userId: targetUserId, organizationId: organizationId } },
	  data: { role: Role.MEMBER }
	})
  }

  async removeMember(organizationId: string, targetUserId: string, requesterUserId: string) {
	await this.requireAdmin(organizationId, requesterUserId)
	if (targetUserId === requesterUserId) {
	  throw new BadRequestException(`Admins cannot remove themselves from the organization with id ${organizationId}`)
	}
	return await this.leaveOrganization(organizationId, targetUserId)
  }

  async checkOrganizationsAtUserDeletion(userId: string) {
    const adminMemberships = await this.prisma.organizationMember.findMany({
	  where: {
		userId: userId,
		leftAt: null,
		role: Role.ADMIN
	  }
	})
	
	const organizationIdsToDelete: string[] = []
	for (const membership of adminMemberships) { 
		const activeMembersCount = await this.countActiveMembers(membership.organizationId)
		const activeAdminsCount = await this.countActiveAdmins(membership.organizationId)
	  if (activeMembersCount > 1 && activeAdminsCount <= 1) {
		throw new BadRequestException(`Cannot delete user with id ${userId} as they are the last admin of organization with id ${membership.organizationId}`)
	  }
	  if (activeMembersCount === 1) {
		organizationIdsToDelete.push(membership.organizationId)
	  }
	}
	return organizationIdsToDelete
  }
}
