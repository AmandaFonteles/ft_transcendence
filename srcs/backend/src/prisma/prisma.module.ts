import { Global, Module } from '@nestjs/common'
import { PrismaService } from './prisma.service'

// @Global : PrismaService est injectable partout sans reimporter ce module.
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService]
})
export class PrismaModule {}
