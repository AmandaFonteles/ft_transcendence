import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import cookieParser from 'cookie-parser'
import { AppModule } from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)

  // Aligne avec la regle "location /api" de nginx.
  app.setGlobalPrefix('api')

  // Sans cookie-parser, req.cookies est undefined et AuthController.refresh() ne
  // peut pas lire le refreshToken.
  app.use(cookieParser())

  app.useGlobalPipes(
    new ValidationPipe({
      // Supprime les champs non declares dans le DTO, puis rejette la requete
      // en 400 plutot que de les ignorer silencieusement.
      whitelist: true,
      forbidNonWhitelisted: true,
      // Necessaire aux query params, toujours recus sous forme de chaines.
      transform: true
    })
  )

  // Sans ca, onModuleDestroy (fermeture Prisma) n'est jamais appele a l'arret.
  app.enableShutdownHooks()

  await app.listen(3000, '0.0.0.0')
}

bootstrap()
