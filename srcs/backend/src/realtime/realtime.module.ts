// =============================================================================
// realtime.module.ts : assemble le module temps reel.
// =============================================================================

// Importe le decorateur @Module.
import { Module } from '@nestjs/common'
// Importe le gateway (point d'entree WebSocket).
import { RealtimeGateway } from './realtime.gateway'
// Importe le registre de presence.
import { PresenceRegistry } from './presence.registry'

// Declare et cable le module.
@Module({
  // Un gateway se declare comme un PROVIDER (pas dans "controllers" : il ne sert pas de routes HTTP).
  providers: [RealtimeGateway, PresenceRegistry],
  // [CONCEPT: frontiere de module] On n'exporte QUE PresenceRegistry.
  // Pourquoi ne pas exporter le gateway : les autres modules (chat, notifications)
  // n'ont pas a manipuler la couche transport ; s'ils injectaient le gateway, qui
  // lui-meme injectera leurs services, on creerait des dependances circulaires.
  // Regle d'equipe : on consomme l'infra temps reel, on ne la pilote pas.
  exports: [PresenceRegistry],
})
// Classe vide : configuration portee par le decorateur.
export class RealtimeModule {}
