import { Module } from '@nestjs/common'
import { OrganizationsController } from './organizations.controller'
import { OrganizationsService } from './organizations.service'
import { FriendshipModule } from '../friendship/friendship.module'

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
  imports: [FriendshipModule],
})
export class OrganizationsModule {}
