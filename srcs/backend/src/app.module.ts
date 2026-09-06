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
// Importe le module temps reel (gateway WebSocket partage).
import { RealtimeModule } from './realtime/realtime.module'
// Importe le module de feature "auth".
import { AuthModule } from './auth/auth.module'
// Importe le module de feature "organizations".
import { OrganizationsModule } from './organizations/organizations.module';
// Importe le module de feature "tasks".
import { TasksModule } from './tasks/tasks.module';
// Importe le module de feature "files".
import { FilesModule } from './files/files.module';

import { FriendshipModule } from './friendship/friendship.module';

import { ChatModule } from './chat/chat.module'

// Importe le module de monitoring
import { MetricsModule } from './metrics/metrics.module';

// Declare et cable le module racine.
@Module({
  // On importe PrismaModule (@Global => PrismaService injectable partout), puis un
  // module par domaine. C'est LE carrefour d'assemblage : tout module d'equipe
  // doit s'ajouter a cette liste pour exister au demarrage.
  imports: [PrismaModule, UsersModule, RealtimeModule, AuthModule, OrganizationsModule, TasksModule, FilesModule, FriendshipModule , ChatModule, MetricsModule],
  // Controllers de ce module.
  controllers: [AppController],
  // Providers de ce module.
  providers: [AppService]
})
// Classe vide : configuration portee par le decorateur.
export class AppModule {}
