// [CONCEPT: bootstrap d'application] Point de demarrage de l'app NestJS.

// Importe la fabrique d'application Nest.
import { NestFactory } from '@nestjs/core'
// Importe le module racine.
import { AppModule } from './app.module'

// Fonction asynchrone de demarrage.
async function bootstrap() {
  // Construit l'application a partir d'AppModule.
  const app = await NestFactory.create(AppModule)

  // Prefixe toutes les routes par /api (aligne avec "location /api" de nginx).
  app.setGlobalPrefix('api')

  // [CONCEPT: enableShutdownHooks] Active l'ecoute des signaux d'arret (SIGTERM...).
  // Pourquoi : sans ca, le hook onModuleDestroy de PrismaService ne serait pas appele,
  // et la connexion a la base ne se fermerait pas proprement a l'arret du conteneur.
  app.enableShutdownHooks()

  // Ecoute sur le port 3000, sur toutes les interfaces (joignable par nginx).
  await app.listen(3000, '0.0.0.0')
}

// Lance le demarrage.
bootstrap()
