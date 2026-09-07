import { Injectable } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getHealth() {
    // Lecture seule : prouve la connexion a Postgres sans creer de donnees.
    const users = await this.prisma.user.count()

    return { status: 'ok', users }
  }
}
