import { Module, forwardRef } from '@nestjs/common'
import { OrganizationsController } from './organizations.controller'
import { OrganizationsService } from './organizations.service'
import { FriendshipModule } from '../friendship/friendship.module'
import { StorageModule } from '../files/storage.module'
// AJOUT NY : donne acces au gateway pour diffuser les changements de membres.
// Pas de cycle : RealtimeModule n'importe pas OrganizationsModule.
import { RealtimeModule } from '../realtime/realtime.module'

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService],
  imports: [FriendshipModule, forwardRef(() => RealtimeModule), StorageModule], 
})
export class OrganizationsModule {}
