import { Module } from '@nestjs/common'
import { OrganizationsModule } from '../organizations/organizations.module'
import { FilesService } from './files.service'
import { FilesController } from './files.controller'

@Module({
  controllers: [FilesController],
  providers: [FilesService],
  imports: [OrganizationsModule],
})
export class FilesModule {}
