import { Module } from '@nestjs/common'
import { UsersController } from './users.controller'
import { UsersService } from './users.service'

import { OrganizationsModule } from '../organizations/organizations.module'
import { StorageModule } from '../files/storage.module'

@Module({
  imports: [OrganizationsModule, StorageModule],
  controllers: [UsersController],
  // PrismaService n'est pas liste : il vient du PrismaModule @Global.
  providers: [UsersService],
  exports: [UsersService]
})
export class UsersModule {}
