// [CONCEPT: module NestJS] Un module regroupe du code lie. AppModule est la racine.
// C'est le carrefour unique ou chaque coequipier enregistrera plus tard son module
// (AuthModule, ChatModule, BoardsModule...) dans "imports".

// Importe le decorateur @Module qui declare un module.
import { Module } from '@nestjs/common'
// Importe le controller racine (gestion des routes HTTP).
import { AppController } from './app.controller'
// Importe le service racine (la logique).
import { AppService } from './app.service'

// Decore la classe pour la declarer comme module Nest et cabler ses membres.
@Module({
  // Autres modules importes ; vide pour l'instant (les modules des features viendront ici).
  imports: [],
  // Controllers de ce module : ils gerent les requetes entrantes.
  controllers: [AppController],
  // Providers (services injectables) de ce module : ils portent la logique.
  providers: [AppService]
})
// Classe vide : toute la configuration est portee par le decorateur ci-dessus.
export class AppModule {}
