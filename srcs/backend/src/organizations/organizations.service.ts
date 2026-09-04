import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { Role, InvitePolicy } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { FriendshipService } from '../friendship/friendship.service'
import { StorageService } from '../files/storage.service'
import { CreateOrganizationDto } from './dto/create-organization.dto'
import { UpdateOrganizationDto } from './dto/update-organization.dto'


@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService, private readonly friendship: FriendshipService, private readonly storage: StorageService) {}
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
		},
		invitePolicy: data.invitePolicy
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

  private async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({ where: { id: id } })
    if (!organization) {
      throw new NotFoundException(`Le projet n'a pas été trouvé`)
    }

    return organization
  }

  async findOneForMember(organizationId: string, requesterUserId: string) {
    const organization = await this.findOne(organizationId)
	await this.requireActiveMember(organizationId, requesterUserId)
	return organization
  }

  async update(organizationId: string, requesterUserId: string, data: UpdateOrganizationDto) {
	if (data.name === undefined && data.description === undefined && data.invitePolicy === undefined) {
	  throw new BadRequestException(`Aucune donnée fournie pour la mise à jour`)
	}
    await this.requireAdmin(organizationId, requesterUserId)
    return await this.prisma.organization.update({ where: { id: organizationId }, data: data })
  }

  async remove(organizationId: string, requesterUserId: string) {
	await this.requireAdmin(organizationId, requesterUserId)
	const organization = await this.prisma.organization.delete({ where: { id: organizationId } })
	await this.storage.removeOrganizationFolder(organizationId)
	return organization
  }

  private async findMembershipRecord(organizationId: string, userId: string) {
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
	  throw new NotFoundException(`Cet utilisateur n'est pas un membre de ce projet`)
	}
	return member
  }//utile ?

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

  private async checkInvitePolicy(organizationId: string, requesterUserId: string) {
	const organization = await this.findOne(organizationId)
	if (organization.invitePolicy === InvitePolicy.ADMIN_ONLY) {
	  await this.requireAdmin(organizationId, requesterUserId)
	} else if (organization.invitePolicy === InvitePolicy.ANY_MEMBER) {
	  await this.requireActiveMember(organizationId, requesterUserId)
	} else {
	  throw new BadRequestException(`Politique d'invitation invalide`)
	}
  }

  async addMember(organizationId: string, targetUserId: string, requesterUserId: string) {
	await this.checkInvitePolicy(organizationId, requesterUserId)
	const existingMember = await this.findMembershipRecord(organizationId, targetUserId)
	if (existingMember && existingMember.leftAt === null) {
      throw new BadRequestException(`Cet utilisateur est déjà membre actif de ce projet`)
	}
	if (await this.friendship.areFriends(requesterUserId, targetUserId) === false) {
	  throw new BadRequestException(`Vous ne pouvez inviter que des amis à rejoindre un projet`)
	}
	if (existingMember && existingMember.leftAt !== null) {
	  return await this.prisma.organizationMember.update({
	    where: { userId_organizationId: { userId: targetUserId, organizationId: organizationId } },
	    data: { leftAt: null }
	  })
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
	  throw new BadRequestException(`Impossible de quitter le projet car c'est le dernier administrateur actif et il y a d'autres membres actifs. Veuillez promouvoir un autre membre avant de quitter.`)
	}
	if (activeMembersCount === 1) {
	  await this.prisma.organization.delete({ where: { id: organizationId } })
	  await this.storage.removeOrganizationFolder(organizationId)
	  return true
	}
	await this.prisma.taskAssignment.deleteMany({ where: { memberId: member.id } })
	await this.prisma.organizationMember.update({
      where: { userId_organizationId: { userId: userId, organizationId: organizationId } },
      data: { leftAt: new Date(), role: Role.MEMBER }
    })
	return false
  }

  async requireActiveMember(organizationId: string, userId: string) {
	const member = await this.findActiveMember(organizationId, userId)
	if (!member) {
	  throw new ForbiddenException(`Cette action nécessite d'être un membre actif du projet`)
	}
	return member
  }

  async requireActiveMembersByUserIds(organizationId: string, memberUserIds: string[]) {
	const uniqueUserIds = [...new Set(memberUserIds)]
    const activeMembers = await this.prisma.organizationMember.findMany({
      where: {
        organizationId: organizationId,
        userId: {
          in: uniqueUserIds
        },
        leftAt: null
      }
    })
	if (activeMembers.length !== uniqueUserIds.length) {
	  throw new NotFoundException(`Un ou plusieurs utilisateurs ne sont pas des membres actifs de ce projet`)
	}
    return activeMembers
  }

  async requireAdmin(organizationId: string, userId: string) {
    const member = await this.requireActiveMember(organizationId, userId)
    if (member.role !== Role.ADMIN) {
      throw new ForbiddenException(`Cette action nécessite d'être administrateur du projet`)
    }
    return member
  }

  async promoteMember(organizationId: string, targetUserId: string, requesterUserId: string) {
    await this.requireAdmin(organizationId, requesterUserId)
	const member = await this.requireActiveMember(organizationId, targetUserId)
	if (member.role === Role.ADMIN) {
	  throw new BadRequestException(`Cet utilisateur est déjà administrateur du projet`)
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
	  throw new BadRequestException(`Impossible de rétrograder cet utilisateur, il n'est pas administrateur de ce projet`)
	}
	if (await this.countActiveAdmins(organizationId) <= 1) {
	  throw new BadRequestException(`Impossible de rétrograder le dernier administrateur du projet. Veuillez promouvoir un autre membre avant de rétrograder cet administrateur.`)
	}
	return await this.prisma.organizationMember.update({
	  where: { userId_organizationId: { userId: targetUserId, organizationId: organizationId } },
	  data: { role: Role.MEMBER }
	})
  }

  async removeMember(organizationId: string, targetUserId: string, requesterUserId: string) {
	await this.requireAdmin(organizationId, requesterUserId)
	if (targetUserId === requesterUserId) {
	  throw new BadRequestException(`Les administrateurs ne peuvent pas s'expulser eux-mêmes du projet. Veuillez utiliser la fonction "quitter le projet" à la place.`)
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
		throw new BadRequestException(`Impossible de supprimer l'utilisateur car il est le dernier administrateur actif d'un projet et qu'il y a d'autres membres actifs. Veuillez promouvoir un autre membre avant de supprimer l'utilisateur.`)
	  }
	  if (activeMembersCount === 1) {
		organizationIdsToDelete.push(membership.organizationId)
	  }
	}
	return organizationIdsToDelete
  }

  async findAllMembers(organizationId: string, requesterId: string) {
	await this.requireActiveMember(organizationId, requesterId)
	return await this.prisma.organizationMember.findMany({
	  where: {
		organizationId: organizationId,
		leftAt: null
	  },
	  select: {
		role: true,
		user: {
		  select: {
			id: true,
			displayName: true,
			avatarUrl: true
		  }
		}
	  }
	})
  }
}
