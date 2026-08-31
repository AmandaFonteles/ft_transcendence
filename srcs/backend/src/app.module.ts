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
<<<<<<< HEAD
// Importe le module temps reel (gateway WebSocket partage).
import { RealtimeModule } from './realtime/realtime.module'
=======
>>>>>>> origin/Quentin
// Importe le module de feature "auth".
import { AuthModule } from './auth/auth.module'
// Importe le module de feature "organizations".
import { OrganizationsModule } from './organizations/organizations.module';
<<<<<<< HEAD
// Importe le module de feature "tasks".
import { TasksModule } from './tasks/tasks.module';

// Declare et cable le module racine.
@Module({
  // On importe PrismaModule (@Global => PrismaService injectable partout) et UsersModule.
  // Chaque futur module d'equipe (AuthModule, BoardsModule...) s'ajoutera dans cette liste.
  imports: [PrismaModule, UsersModule, RealtimeModule, AuthModule, OrganizationsModule, TasksModule],
=======

// Declare et cable le module racine.
@Module({
  // On importe PrismaModule (@Global => PrismaService injectable partout), UsersModule
  // et AuthModule. Chaque futur module d'equipe (BoardsModule...) s'ajoutera dans cette liste.
  imports: [PrismaModule, UsersModule, AuthModule, OrganizationsModule],
>>>>>>> origin/Quentin
  // Controllers de ce module.
  controllers: [AppController],
  // Providers de ce module.
  providers: [AppService]
})
// Classe vide : configuration portee par le decorateur.
export class AppModule {}
