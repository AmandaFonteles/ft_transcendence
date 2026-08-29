import { Module } from '@nestjs/common'
import { OrganizationsModule } from '../organizations/organizations.module'
import { TasksService } from './tasks.service'
import { TasksController } from './tasks.controller'

@Module({
  controllers: [TasksController],
  providers: [TasksService],
  imports: [OrganizationsModule],
})
export class TasksModule {}
