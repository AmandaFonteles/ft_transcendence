// =============================================================================
// realtime.module.ts : assemble le module temps reel.
// =============================================================================

import { Module, forwardRef } from '@nestjs/common'
// Importe le module JWT : le gateway verifie le jeton d'acces au handshake.
import { JwtModule } from '@nestjs/jwt'
// Importe le gateway (point d'entree WebSocket).
import { RealtimeGateway } from './realtime.gateway'
// Importe le registre de presence.
import { PresenceRegistry } from './presence.registry'
import { ChatModule } from '../chat/chat.module' // chat
import { UsersModule } from '../users/users.module'       // isOnline
import { FriendshipModule } from '../friendship/friendship.module' //ajout
// Declare et cable le module.
@Module({
  // JwtModule.register({}) fournit JwtService SANS secret par defaut : le gateway
  // passe explicitement JWT_ACCESS_SECRET a chaque verification. Pourquoi
  // l'expliciter plutot que de le configurer ici : le projet manipule DEUX
  // secrets (acces et rafraichissement), et une socket ne doit accepter que le
  // jeton d'ACCES. Le nommer sur place rend l'erreur impossible a commettre en
  // silence.
  imports: [
    JwtModule.register({}),
    ChatModule,
    forwardRef(() => UsersModule),
    forwardRef(() => FriendshipModule),
  ],
  // Un gateway se declare comme un PROVIDER (pas dans "controllers" : il ne sert pas de routes HTTP).
  providers: [RealtimeGateway, PresenceRegistry],
  // [CONCEPT: frontiere de module] On n'exporte QUE PresenceRegistry.
  // Pourquoi ne pas exporter le gateway : les autres modules (chat, notifications)
  // n'ont pas a manipuler la couche transport ; s'ils injectaient le gateway, qui
  // lui-meme injectera leurs services, on creerait des dependances circulaires.
  // Regle d'equipe : on consomme l'infra temps reel, on ne la pilote pas.
  exports: [PresenceRegistry, RealtimeGateway],
})
// Classe vide : configuration portee par le decorateur.
export class RealtimeModule {}