import { Module, forwardRef } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { RealtimeGateway } from './realtime.gateway'
import { PresenceRegistry } from './presence.registry'
import { ChatModule } from '../chat/chat.module'
import { UsersModule } from '../users/users.module'
import { FriendshipModule } from '../friendship/friendship.module'

@Module({
  // JwtModule.register({}) fournit JwtService sans secret par defaut : le
  // gateway passe explicitement JWT_ACCESS_SECRET, pour qu'une socket ne puisse
  // pas accepter le jeton de rafraichissement.
  imports: [
    JwtModule.register({}),
    ChatModule,
    forwardRef(() => UsersModule),
    forwardRef(() => FriendshipModule),
  ],
  providers: [RealtimeGateway, PresenceRegistry],
  exports: [PresenceRegistry, RealtimeGateway],
})
export class RealtimeModule {}
