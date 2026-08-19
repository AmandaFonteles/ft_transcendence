// [CONCEPT: module NestJS] AppModule est la racine et le carrefour d'assemblage.

// Importe le decorateur @Module.
import { Module } from '@nestjs/common'
// Importe le controller racine.
import { AppController } from './app.controller'
// Importe le service racine.
import { AppService } from './app.service'
// Importe le module Prisma (infrastructure ORM, @Global).
import { PrismaModule } from './prisma/prisma.module'
// Importe le module de feature "users".
import { UsersModule } from './users/users.module'

// Declare et cable le module racine.
@Module({
  // On importe PrismaModule (@Global => PrismaService injectable partout) et UsersModule.
  // Chaque futur module d'equipe (AuthModule, BoardsModule...) s'ajoutera dans cette liste.
  imports: [PrismaModule, UsersModule],
  // Controllers de ce module.
  controllers: [AppController],
  // Providers de ce module.
  providers: [AppService]
})
// Classe vide : configuration portee par le decorateur.
export class AppModule {}
