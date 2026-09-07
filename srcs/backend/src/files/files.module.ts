import { Module } from '@nestjs/common'
import { OrganizationsModule } from '../organizations/organizations.module'
import { RealtimeModule } from '../realtime/realtime.module'
import { StorageModule } from './storage.module'
import { FilesService } from './files.service'
import { FilesController } from './files.controller'

@Module({
  controllers: [FilesController],
  providers: [FilesService],
  imports: [OrganizationsModule, StorageModule, RealtimeModule],
})
export class FilesModule {}
