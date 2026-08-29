import { 
	Body, 
	Controller, 
	Get, 
	Post, 
	Param, 
	Patch, 
	Delete, 
	UseGuards 
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { TasksService } from './tasks.service'
import { CreateTaskDto } from './dto/create-task.dto'
import { UpdateTaskDto } from './dto/update-task.dto'
import { UpdateTaskStatusDto } from './dto/update-task-status.dto'
import { TransferTaskOwnerDto } from './dto/transfer-task-owner.dto'
import { AssignTaskMemberDto } from './dto/assign-task-member.dto'

@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  async create(@Param('organizationId') organizationId: string, @CurrentUser() user: { userId: string }, @Body() data: CreateTaskDto) {
	const task = await this.tasksService.create(data, organizationId, user.userId)
	return { 
		message: `Tâche créée avec succès !`,
		taskId: task.id
	}
  }

  @Post(':taskId/assignments')
  async assignMember(@Param('organizationId') organizationId: string, @Param('taskId') taskId: string, @CurrentUser() user: { userId: string }, @Body() data: AssignTaskMemberDto) {
	await this.tasksService.assignMember(taskId, data, organizationId, user.userId)
	return { 
		message: `Membre assigné avec succès !`,
		taskId: taskId
	}
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
  async findAllForOrganization(@Param('organizationId') organizationId: string, @CurrentUser() user: { userId: string }) {
	return await this.tasksService.findAllForOrganization(organizationId, user.userId)
  }

  @Patch(':taskId')
  async update(@Param('organizationId') organizationId: string, @Param('taskId') taskId: string, @CurrentUser() user: { userId: string }, @Body() data: UpdateTaskDto) {
	await this.tasksService.update(taskId, data, organizationId, user.userId)
	return { 
		message: `Mise à jour réussie !`,
		taskId: taskId
	}
  }

  @Patch(':taskId/status')
  async updateStatus(@Param('organizationId') organizationId: string, @Param('taskId') taskId: string, @CurrentUser() user: { userId: string }, @Body() data: UpdateTaskStatusDto) {
	return await this.tasksService.updateStatus(taskId, data, organizationId, user.userId)
  }

  @Patch(':taskId/transfer-owner')
  async transferOwner(@Param('organizationId') organizationId: string, @Param('taskId') taskId: string, @CurrentUser() user: { userId: string }, @Body() data: TransferTaskOwnerDto) {
	await this.tasksService.transferOwner(taskId, data, organizationId, user.userId)
	return { 
		message: `Propriété transférée avec succès !`,
		taskId: taskId
	}
  }

  @Delete(':taskId/assignments/:memberUserId')
  async removeAssignment(@Param('organizationId') organizationId: string, @Param('taskId') taskId: string, @Param('memberUserId') memberUserId: string, @CurrentUser() user: { userId: string }) {
	await this.tasksService.removeAssignment(taskId, memberUserId, organizationId, user.userId)
	return { 
		message: `Assignation supprimée avec succès !`,
		taskId: taskId
	}
  }

  @Delete(':taskId')
  async delete(@Param('organizationId') organizationId: string, @Param('taskId') taskId: string, @CurrentUser() user: { userId: string }) {
	await this.tasksService.delete(taskId, organizationId, user.userId)
	return { 
		message: `Tâche supprimée avec succès !`,
		taskId: taskId
	}
  }
}
