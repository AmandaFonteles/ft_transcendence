import { Module } from '@nestjs/common'
import { OrganizationsModule } from '../organizations/organizations.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { TasksService } from './tasks.service'
import { TasksController } from './tasks.controller'

@Module({
  controllers: [TasksController],
  providers: [TasksService],
  imports: [OrganizationsModule, RealtimeModule],
})
export class TasksModule {}
