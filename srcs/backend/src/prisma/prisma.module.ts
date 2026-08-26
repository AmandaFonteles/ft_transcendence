// [CONCEPT: module Prisma] Regroupe et EXPOSE le PrismaService pour toute l'app.

// Importe @Global (portee globale) et @Module (declaration de module).
import { Global, Module } from '@nestjs/common'
// Importe le service a fournir/exporter.
import { PrismaService } from './prisma.service'

// [CONCEPT: @Global] Rend ce module global : les autres modules peuvent injecter
// PrismaService SANS reimporter PrismaModule a chaque fois.
// Pourquoi : c'est de l'infrastructure partagee par tout le monde ; evite la repetition.
// Compromis : a reserver a ce genre de service transverse, pas a tout module.
@Global()
// Declare le module et son cablage.
@Module({
  // Fournit le service au conteneur d'injection de Nest.
  providers: [PrismaService],
  // Exporte le service pour qu'il soit injectable AILLEURS (sinon il resterait prive).
  exports: [PrismaService]
})
// Classe vide : toute la config est portee par les decorateurs.
export class PrismaModule {}
