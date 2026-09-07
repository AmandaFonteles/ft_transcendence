import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { PrismaModule } from './prisma/prisma.module'
import { UsersModule } from './users/users.module'
import { RealtimeModule } from './realtime/realtime.module'
import { AuthModule } from './auth/auth.module'
import { OrganizationsModule } from './organizations/organizations.module';
import { TasksModule } from './tasks/tasks.module';
import { FilesModule } from './files/files.module';
import { FriendshipModule } from './friendship/friendship.module';
import { ChatModule } from './chat/chat.module'
import { MetricsModule } from './metrics/metrics.module';

// Carrefour d'assemblage : tout module de feature doit figurer dans "imports"
// pour exister au demarrage.
@Module({
  imports: [PrismaModule, UsersModule, RealtimeModule, AuthModule, OrganizationsModule, TasksModule, FilesModule, FriendshipModule , ChatModule, MetricsModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
