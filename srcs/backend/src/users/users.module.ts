// [CONCEPT: module de feature] Regroupe le controller et le service du domaine "users".
// C'est l'unite qu'on importe dans AppModule, et le GABARIT des futurs modules d'equipe.

// Importe le decorateur @Module.
import { Module } from '@nestjs/common'
// Importe le controller de ce module.
import { UsersController } from './users.controller'
// Importe le service de ce module.
import { UsersService } from './users.service'

// Declare et cable le module.
@Module({
  // Les routes exposees par ce module.
  controllers: [UsersController],
  // Les services instancies par ce module.
  // PrismaService n'est PAS liste ici : il vient du PrismaModule @Global, deja injectable.
  providers: [UsersService]
  // "exports: [UsersService]" serait a ajouter seulement si un AUTRE module devait
  // injecter UsersService (ex. le module chat plus tard). Inutile pour l'instant.
})
// Classe vide : configuration portee par le decorateur.
export class UsersModule {}
