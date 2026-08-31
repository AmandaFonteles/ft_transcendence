import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common'
import { OrganizationsService } from '../organizations/organizations.service'
import { Role } from '@prisma/client'
import { PrismaService } from '../prisma/prisma.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { UpdateTaskStatusDto } from './dto/update-task-status.dto'
import { TransferTaskOwnerDto } from './dto/transfer-task-owner.dto'
import { AssignTaskMemberDto } from './dto/assign-task-member.dto'
import { TaskVisibilityFilterDto } from './dto/task-visibility-filter.dto'

@Injectable()
export class TasksService {
  constructor(private readonly prisma: PrismaService, private readonly orgaServ: OrganizationsService) {}

  async findOne(taskId: string) {
	const task = await this.prisma.task.findUnique({ where: { id: taskId } })
	if (!task) {
		throw new NotFoundException('Tâche inexistante')
	}
	return task
  }

  async requireTaskVisibleToMember(	taskId: string,	organizationId: string,	requesterId: string) {
	const task = await this.requireTaskInOrganization(taskId, organizationId)
	const activeMember = await this.orgaServ.requireActiveMember(organizationId, requesterId)
	if (activeMember.role !== Role.ADMIN && task.ownerId !== activeMember.id && await this.countAssignments(taskId) > 0 && !await this.findAssignmentRecord(taskId, activeMember.id)) {
		throw new ForbiddenException('Tâche inaccessible pour ce membre')
	}
	return task
}

  async findOneForMember(taskId: string, organizationId: string, requesterId: string) {
	return await this.requireTaskVisibleToMember(taskId, organizationId, requesterId)
  }

  async findAllForOrganization(organizationId: string, requesterId: string, filters: TaskVisibilityFilterDto) {
	const activeMember = await this.orgaServ.requireActiveMember(organizationId, requesterId)
	const activeMemberToShow = await this.orgaServ.requireActiveMembersByUserIds(organizationId, filters.assignedUserIds || [])
	let showOwned = true
	let showAssignedTasks = filters.assignedUserIds === undefined || filters.assignedUserIds.length > 0
	let showUnassigned = true
	const activeMemberIdsToShow = activeMemberToShow.map(member => member.id)
	if (filters.owned === false) {
		showOwned = false
	}
	if (filters.unassigned === false) {
		showUnassigned = false
	}
	if (activeMember.role === Role.ADMIN) {
		if (!filters.assignedUserIds || filters.assignedUserIds.length === 0) {
			showAssignedTasks = false
		}
		return await this.prisma.task.findMany({
	 	where: { organizationId: organizationId, 
			OR: [
				showOwned ? { ownerId: activeMember.id } : undefined,
				showAssignedTasks ? { taskAssignments: { some: { memberId: { in: activeMemberIdsToShow } } } } : filters.assignedUserIds === undefined? { taskAssignments: { some: {} } } : undefined,
				showUnassigned ? { taskAssignments: { none: {} } } : undefined
			].filter(condition => condition !== undefined)
		},
	  	orderBy: { name: 'asc' }
		})
	}
	if (filters.assignedUserIds && filters.assignedUserIds.length > 0 && !filters.assignedUserIds.includes(activeMember.userId)) {
		showAssignedTasks = false
	}
	return await this.prisma.task.findMany({
	  where: { 
		organizationId: organizationId,
		OR: [
			showOwned ? { ownerId: activeMember.id } : undefined,
			showAssignedTasks ? { taskAssignments: { some: { memberId: activeMember.id } } } : undefined,
			showUnassigned ? { taskAssignments: { none: {} } } : undefined
		].filter(condition => condition !== undefined)
	  },
	  orderBy: { name: 'asc' }
	})
  }

  async create(data: CreateTaskDto, organizationId: string, creatorId: string) {
	const activeMember = await this.orgaServ.requireActiveMember(organizationId, creatorId)
	const startD = data.startDate ? new Date(data.startDate) : undefined
	const dueD = data.dueDate ? new Date(data.dueDate) : undefined

	if (startD && dueD && startD > dueD) {
		throw new BadRequestException('La date de début ne peut pas être postérieure à la date d\'échéance')
	}
	return await this.prisma.task.create({
	  data: {
		name: data.name,
		description: data.description,
		startDate: startD,
		dueDate: dueD,
		organizationId: organizationId,
		ownerId: activeMember.id,
		taskAssignments: data.assignToSelf !== false ? {
			create: {
				memberId: activeMember.id
			}
		} : undefined
	  }
	})
  }

  async requireTaskInOrganization(taskId: string, organizationId: string) {
	const task = await this.findOne(taskId)
	if (task.organizationId !== organizationId) {
		throw new BadRequestException(`La tâche n'appartient pas à ce projet`)
	}
	return task
  }

  async requireTaskOwnerOrAdmin(taskId: string, organizationId: string, requesterId: string) {
	const task = await this.requireTaskInOrganization(taskId, organizationId)
	const activeMember = await this.orgaServ.requireActiveMember(organizationId, requesterId)
	if (task.ownerId !== activeMember.id) {
		await this.orgaServ.requireAdmin(organizationId, requesterId)
	}
	return task
  }

  async update(taskId: string, data: UpdateTaskDto, organizationId: string, requesterId: string) {
	if (data.name === undefined && data.description === undefined && data.startDate === undefined && data.dueDate === undefined) {
		throw new BadRequestException(`Aucune donnée fournie pour la mise à jour`)
	}
	const task = await this.requireTaskOwnerOrAdmin(taskId, organizationId, requesterId)
	const startD = data.startDate ? new Date(data.startDate) : data.startDate === undefined ? undefined : null
	const dueD = data.dueDate ? new Date(data.dueDate) : data.dueDate === undefined ? undefined : null
	const newStartDate = startD === undefined ? task.startDate : startD
	const newDueDate = dueD === undefined ? task.dueDate : dueD
	if (newStartDate && newDueDate && newStartDate > newDueDate) {
		throw new BadRequestException('La date de début ne peut pas être postérieure à la date d\'échéance')
	}
	return await this.prisma.task.update({
	  where: { id: taskId },
	  data: {
		name: data.name,
		description: data.description,
		startDate: startD,
		dueDate: dueD
	  }
	})
  }

  async updateStatus(taskId: string, data: UpdateTaskStatusDto, organizationId: string, requesterId: string) {
	const task = await this.requireTaskInOrganization(taskId, organizationId)
	const activeMember = await this.orgaServ.requireActiveMember(organizationId, requesterId)
	const assignment = await this.findAssignmentRecord(taskId, activeMember.id)
	if (!assignment && task.ownerId !== activeMember.id) {
		await this.orgaServ.requireAdmin(organizationId, requesterId)
	}
	return await this.prisma.task.update({
	  where: { id: taskId },
	  data: {
		status: data.status
	  }
	})
  }

  async transferOwner(taskId: string, data: TransferTaskOwnerDto, organizationId: string, requesterId: string) {
	await this.requireTaskOwnerOrAdmin(taskId, organizationId, requesterId)
	const newActiveMember = await this.orgaServ.requireActiveMember(organizationId, data.newOwnerUserId)
	return await this.prisma.task.update({
	  where: { id: taskId },
	  data: {
		ownerId: newActiveMember.id
	  }
	})
  }

  async findAssignments(taskId: string, organizationId: string, requesterId: string) {
	await this.requireTaskVisibleToMember(taskId, organizationId, requesterId)
	return await this.prisma.taskAssignment.findMany({
	  where: { taskId: taskId },
	  include: { member: true }
	})
  }

  async countAssignments(taskId: string) {
	return await this.prisma.taskAssignment.count({
	  where: { taskId: taskId }
	})
  }

  async findAssignmentRecord(taskId: string, memberId: string) {
	const taskAssignment = await this.prisma.taskAssignment.findUnique({
	  where: {
		taskId_memberId: {
		  taskId: taskId,
		  memberId: memberId
		}
	  }
	})
	return taskAssignment
  }

  async assignMember(taskId: string, data: AssignTaskMemberDto, organizationId: string, requesterId: string) {
	const activeMember = await this.orgaServ.requireActiveMember(organizationId, requesterId)
	const task = await this.requireTaskInOrganization(taskId, organizationId)
	const nbAssignments = await this.countAssignments(taskId)
	if (task.ownerId !== activeMember.id && (nbAssignments === 0 && (requesterId !== data.memberUserId) || nbAssignments !== 0)) {
		await this.orgaServ.requireAdmin(organizationId, requesterId)
	}
	const newActiveMember = await this.orgaServ.requireActiveMember(organizationId, data.memberUserId)
	if ( await this.findAssignmentRecord(taskId, newActiveMember.id)) {
		throw new BadRequestException(`L'utilisateur est déjà assigné à cette tâche`)
	}
	return await this.prisma.taskAssignment.create({
	  data: {
		taskId: taskId,
		memberId: newActiveMember.id
	  }
	})
  }

  async removeAssignment(taskId: string, memberUserId: string, organizationId: string, requesterId: string) {
	const activeMember = await this.orgaServ.requireActiveMember(organizationId, requesterId)
	const task = await this.requireTaskInOrganization(taskId, organizationId)
	if (task.ownerId !== activeMember.id && requesterId !== memberUserId) {
		await this.orgaServ.requireAdmin(organizationId, requesterId)
	}
	const memberToRemove = await this.orgaServ.requireActiveMember(organizationId, memberUserId)
	const assignment = await this.findAssignmentRecord(taskId, memberToRemove.id)
	if (!assignment) {
		throw new NotFoundException(`L'utilisateur n'est pas assigné à cette tâche`)
	}
	return await this.prisma.taskAssignment.delete({
	  where: {
		taskId_memberId: {
		  taskId: taskId,
		  memberId: memberToRemove.id
		}
	  }
	})
  }

  async delete(taskId: string, organizationId: string, requesterId: string) {
	await this.requireTaskOwnerOrAdmin(taskId, organizationId, requesterId)
	return await this.prisma.task.delete({
	  where: { id: taskId }
	})
  }
}
