import { Module, forwardRef } from '@nestjs/common'
import { FriendshipController } from './friendship.controller';
import { FriendshipService } from './friendship.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RealtimeModule } from '../realtime/realtime.module' // AJOUT

@Module({
  imports: [PrismaModule, forwardRef(() => RealtimeModule)],
  controllers: [FriendshipController],
  providers: [FriendshipService],
  exports: [FriendshipService],
})
export class FriendshipModule {}