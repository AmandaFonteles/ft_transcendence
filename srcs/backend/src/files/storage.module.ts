import { Module } from '@nestjs/common'
// import { OrganizationsModule } from '../organizations/organizations.module'
// import { FilesModule } from './files.module'
import { StorageService } from './storage.service'

@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}
