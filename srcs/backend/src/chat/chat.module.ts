import { Module } from '@nestjs/common'
import { MessageController } from './message.controller'
import { MessageService } from './message.service'
import { PrismaModule } from '../prisma/prisma.module'

@Module({
  imports: [PrismaModule],
  controllers: [MessageController],
  providers: [MessageService],
  exports: [MessageService], // pour que RealtimeModule puisse l'injecter dans la gateway
})
export class ChatModule {}