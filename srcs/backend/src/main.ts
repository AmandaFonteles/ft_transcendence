// [CONCEPT: bootstrap d'application] Toute app NestJS demarre ici : on construit
// l'app a partir du module racine, on la configure, puis on ecoute.

// Importe la fabrique qui cree une instance d'application Nest.
import { NestFactory } from '@nestjs/core'
// Importe le module racine qui declare tout le graphe de l'application.
import { AppModule } from './app.module'

// Fonction asynchrone de demarrage (create et listen renvoient des Promesses).
async function bootstrap() {
  // Construit l'application a partir d'AppModule (assemble controllers et services).
  const app = await NestFactory.create(AppModule)

  // [CONCEPT: prefixe global de routes] Toutes les routes passent desormais sous /api.
  // Donc @Get('health') devient GET /api/health -> colle a la regle "location /api" de nginx.
  // Pourquoi : sans ce prefixe, la route serait /health et la regle /api de nginx renverrait 404.
  app.setGlobalPrefix('api')

  // Ecoute sur le port 3000, sur 0.0.0.0 (toutes les interfaces).
  // Pourquoi 0.0.0.0 : pour que le conteneur nginx puisse joindre le backend a travers le reseau Docker.
  await app.listen(3000, '0.0.0.0')
}

// Lance effectivement la fonction de demarrage.
bootstrap()
