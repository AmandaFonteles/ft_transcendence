// [CONCEPT: provider / service] @Injectable marque une classe que Nest peut injecter.
// Les services portent la logique metier ; les controllers restent minces.

// Importe le decorateur @Injectable.
import { Injectable } from '@nestjs/common'

// Declare la classe comme injectable (Nest peut la fournir a qui la demande).
@Injectable()
export class AppService {
  // Methode qui renvoie l'etat de sante du backend.
  getHealth() {
    // Renvoie un objet ; il devient le corps JSON { "status": "ok" } lu par App.tsx.
    return { status: 'ok' }
  }
}
