import { Module } from '@nestjs/common'
import { OrganizationsController } from './organizations.controller'
import { OrganizationsService } from './organizations.service'

@Module({
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
<<<<<<< HEAD
  exports: [OrganizationsService],
=======
>>>>>>> origin/Quentin
})
export class OrganizationsModule {}
