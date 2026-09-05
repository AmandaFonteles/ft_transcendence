import { 
	Body, 
	Controller, 
	Get, 
	Post, 
	Param, 
	Patch, 
	Delete, 
	Query,
	UseGuards
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { RealtimeGateway } from '../realtime/realtime.gateway'
import { ServerEvents } from '../realtime/realtime.events'
import type { TaskEventPayload } from '../realtime/realtime.events'
import { TasksService } from './tasks.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { UpdateTaskStatusDto } from './dto/update-task-status.dto'
import { TransferTaskOwnerDto } from './dto/transfer-task-owner.dto'
import { AssignTaskMemberDto } from './dto/assign-task-member.dto'
import { TaskVisibilityFilterDto } from './dto/task-visibility-filter.dto'

@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/tasks')
export class TasksController {
  // Le gateway est injecte ICI, dans le controller, et non dans le service :
  // meme convention que OrganizationsController (voir organizations.controller.ts).
  constructor(
	private readonly tasksService: TasksService,
	private readonly realtime: RealtimeGateway,
  ) {}

  @Post()
  async create(@Param('organizationId') organizationId: string, @CurrentUser() user: { userId: string }, @Body() data: CreateTaskDto) {
	const task = await this.tasksService.create(data, organizationId, user.userId)
	const created: TaskEventPayload = { organizationId, taskId: task.id }
	this.realtime.notifyOrganization(organizationId, ServerEvents.TASK_CREATED, created)
	return task
  }

  @Post(':taskId/assignments')
  async assignMember(@Param('organizationId') organizationId: string, @Param('taskId') taskId: string, @CurrentUser() user: { userId: string }, @Body() data: AssignTaskMemberDto) {
	await this.tasksService.assignMember(taskId, data, organizationId, user.userId)
	const assigned: TaskEventPayload = { organizationId, taskId }
	this.realtime.notifyOrganization(organizationId, ServerEvents.TASK_ASSIGNED, assigned)
	return {
		message: `Membre assigné avec succès !`,
		taskId: taskId
	}//Faudra probablement faire le meme retour que pour la creation de tache, avec l'objet complet de l'assignation.
  }

  @Get(':taskId')
  async findOneForMember(@Param('organizationId') organizationId: string, @Param('taskId') taskId: string, @CurrentUser() user: { userId: string }) {
	return await this.tasksService.findOneForMember(taskId, organizationId, user.userId)
  }

  @Get(':taskId/assignments')
  async findAssignments(@Param('organizationId') organizationId: string, @Param('taskId') taskId: string, @CurrentUser() user: { userId: string }) {
	return await this.tasksService.findAssignments(taskId, organizationId, user.userId)
  }


  @Get()
  async findAllForOrganization(@Param('organizationId') organizationId: string, @CurrentUser() user: { userId: string }, @Query() filters: TaskVisibilityFilterDto) {
	return await this.tasksService.findAllForOrganization(organizationId, user.userId, filters)
  }
  

  @Patch(':taskId')
  async update(@Param('organizationId') organizationId: string, @Param('taskId') taskId: string, @CurrentUser() user: { userId: string }, @Body() data: UpdateTaskDto) {
	await this.tasksService.update(taskId, data, organizationId, user.userId)
	const updated: TaskEventPayload = { organizationId, taskId }
	this.realtime.notifyOrganization(organizationId, ServerEvents.TASK_UPDATED, updated)
	return {
		message: `Mise à jour réussie !`,
		taskId: taskId
	}//idem
  }

  @Patch(':taskId/status')
  async updateStatus(@Param('organizationId') organizationId: string, @Param('taskId') taskId: string, @CurrentUser() user: { userId: string }, @Body() data: UpdateTaskStatusDto) {
	const task = await this.tasksService.updateStatus(taskId, data, organizationId, user.userId)
	const updated: TaskEventPayload = { organizationId, taskId }
	this.realtime.notifyOrganization(organizationId, ServerEvents.TASK_UPDATED, updated)
	return task
  }

  @Patch(':taskId/transfer-owner')
  async transferOwner(@Param('organizationId') organizationId: string, @Param('taskId') taskId: string, @CurrentUser() user: { userId: string }, @Body() data: TransferTaskOwnerDto) {
	await this.tasksService.transferOwner(taskId, data, organizationId, user.userId)
	const updated: TaskEventPayload = { organizationId, taskId }
	this.realtime.notifyOrganization(organizationId, ServerEvents.TASK_UPDATED, updated)
	return {
		message: `Propriété transférée avec succès !`,
		taskId: taskId
	}
  }//idem

  @Delete(':taskId/assignments/:memberUserId')
  async removeAssignment(@Param('organizationId') organizationId: string, @Param('taskId') taskId: string, @Param('memberUserId') memberUserId: string, @CurrentUser() user: { userId: string }) {
	await this.tasksService.removeAssignment(taskId, memberUserId, organizationId, user.userId)
	const unassigned: TaskEventPayload = { organizationId, taskId }
	this.realtime.notifyOrganization(organizationId, ServerEvents.TASK_UNASSIGNED, unassigned)
	return {
		message: `Assignation supprimée avec succès !`,
		taskId: taskId
	}//idem
  }

  @Delete(':taskId')
  async delete(@Param('organizationId') organizationId: string, @Param('taskId') taskId: string, @CurrentUser() user: { userId: string }) {
	await this.tasksService.delete(taskId, organizationId, user.userId)
	const deleted: TaskEventPayload = { organizationId, taskId }
	this.realtime.notifyOrganization(organizationId, ServerEvents.TASK_DELETED, deleted)
	return {
		message: `Tâche supprimée avec succès !`,
		taskId: taskId
	}//idem
  }
}
