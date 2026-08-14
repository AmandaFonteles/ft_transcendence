// [CONCEPT: controller] Un controller declare des ROUTES et delegue le travail reel
// a un service. Garder la logique hors du controller est une bonne pratique Nest.

// Importe le decorateur @Controller (declare une classe de routes) et @Get (route GET).
import { Controller, Get } from '@nestjs/common'
// Importe le service dont on aura besoin.
import { AppService } from './app.service'

// Declare la classe comme controller ; chemin de base '' -> combine au prefixe 'api' = /api.
@Controller()
export class AppController {
  // [CONCEPT: injection de dependance] On ne fait jamais "new AppService()" nous-memes :
  // on le demande dans le constructeur et Nest fournit l'instance partagee.
  // "readonly" empeche de reassigner la reference. Pourquoi : code testable et decouple.
  constructor(private readonly appService: AppService) {}

  // Associe la methode a la route GET /api/health.
  @Get('health')
  // Methode appelee a chaque requete sur cette route.
  getHealth() {
    // Delegue au service et renvoie son resultat ; Nest le serialise en JSON automatiquement.
    return this.appService.getHealth()
  }
}
