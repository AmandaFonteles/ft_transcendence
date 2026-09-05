// [CONCEPT: module de feature] Regroupe le controller et le service du domaine "users".
// C'est l'unite qu'on importe dans AppModule, et le GABARIT des futurs modules d'equipe.

// Importe le decorateur @Module.
import { Module } from '@nestjs/common'
// Importe le controller de ce module.
import { UsersController } from './users.controller'
// Importe le service de ce module.
import { UsersService } from './users.service'

import { OrganizationsModule } from '../organizations/organizations.module'// pour supp les donner en meme temps que l'user
import { StorageModule } from '../files/storage.module'

// Declare et cable le module.
@Module({
  imports: [OrganizationsModule, StorageModule], //////// //
  // Les routes exposees par ce module.
  controllers: [UsersController],
  // Les services instancies par ce module.
  // PrismaService n'est PAS liste ici : il vient du PrismaModule @Global, deja injectable.
  providers: [UsersService],
  exports: [UsersService]// pour status online
  // injecter UsersService (ex. le module chat plus tard). Inutile pour l'instant.
})
// Classe vide : configuration portee par le decorateur.
export class UsersModule {}
