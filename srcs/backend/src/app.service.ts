// [CONCEPT: provider / service] Le service touche PostgreSQL via Prisma : c'est la
// preuve concrete de la 4e couche (backend -> base), desormais en LECTURE SEULE.

// Importe le decorateur @Injectable.
import { Injectable } from '@nestjs/common'
// Importe le service Prisma (injecte grace au PrismaModule @Global).
import { PrismaService } from './prisma/prisma.service'

// Rend la classe injectable.
@Injectable()
export class AppService {
  // [CONCEPT: injection de dependance] On demande PrismaService dans le constructeur ;
  // Nest fournit l'instance partagee. On ne fait jamais "new PrismaService()".
  constructor(private readonly prisma: PrismaService) {}

  // Methode asynchrone (les appels a la base renvoient des Promesses).
  async getHealth() {
    // LECTURE SEULE : compte les utilisateurs. Prouve la connexion a Postgres SANS
    // creer de donnees parasites (on a retire l'ecriture-temoin de HealthCheck).
    // Si la table est vide, le compte vaut 0 : la requete fonctionne quand meme.
    const users = await this.prisma.user.count()

    // Renvoie l'etat + le nombre d'utilisateurs ; Nest serialise en JSON.
    return { status: 'ok', users }
  }
}
