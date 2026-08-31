// [CONCEPT: bootstrap d'application] Point de demarrage de l'app NestJS.

// Importe la fabrique d'application Nest.
import { NestFactory } from '@nestjs/core'
// Importe le pipe de validation globale (verifie les DTO a l'execution).
import { ValidationPipe } from '@nestjs/common'
// Importe le middleware de parsing des cookies (lit le cookie httpOnly du refresh token).
import cookieParser from 'cookie-parser'
// Importe le module racine.
import { AppModule } from './app.module'

// Fonction asynchrone de demarrage.
async function bootstrap() {
  // Construit l'application a partir d'AppModule.
  const app = await NestFactory.create(AppModule)

  // Prefixe toutes les routes par /api (aligne avec "location /api" de nginx).
  app.setGlobalPrefix('api')

  // [CONCEPT: middleware cookie-parser] Sans ca, req.cookies serait undefined :
  // AuthController.refresh() ne pourrait pas lire le refreshToken envoye par le navigateur.
  app.use(cookieParser())

  // [CONCEPT: ValidationPipe global] Applique automatiquement les regles class-validator
  // (@IsEmail, @MinLength...) declarees dans SignupDto/LoginDto sur CHAQUE requete entrante,
  // avant meme d'entrer dans le controller. Une requete qui ne respecte pas le DTO
  // est rejetee en 400 Bad Request, sans que tu aies a ecrire cette verification a la main.
  app.useGlobalPipes(
    new ValidationPipe({
      // whitelist : supprime silencieusement tout champ non declare dans le DTO.
      // Empeche un attaquant d'injecter un champ non prevu (ex: { ...dto, isAdmin: true }).
      whitelist: true,
      // forbidNonWhitelisted : au lieu de juste supprimer les champs en trop, rejette
      // carrement la requete en 400. Plus strict, plus explicite pour toi en dev.
      forbidNonWhitelisted: true,
      //Ajout Aileen:
      // transform : permet à Nest de transformer les données entrantes en instances de 
      // DTO et donc d’exécuter class-transformer.
      // Utile pour les query params, qui sont toujours des strings et doivent être transformés.
      transform: true
    })
  )

  // [CONCEPT: enableShutdownHooks] Active l'ecoute des signaux d'arret (SIGTERM...).
  // Pourquoi : sans ca, le hook onModuleDestroy de PrismaService ne serait pas appele,
  // et la connexion a la base ne se fermerait pas proprement a l'arret du conteneur.
  app.enableShutdownHooks()

  // Ecoute sur le port 3000, sur toutes les interfaces (joignable par nginx).
  await app.listen(3000, '0.0.0.0')
}

// Lance le demarrage.
bootstrap()
