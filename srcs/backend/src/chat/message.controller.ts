import { Controller, Get, Param, Query, UseGuards, ForbiddenException } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { CurrentUser } from '../auth/decorators/current-user.decorator'
import { MessageService } from './message.service'
import { ListMessagesDto } from './dto/list-messages.dto'

@UseGuards(JwtAuthGuard)
@Controller('organizations/:organizationId/messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Get()
  async list(
    @Param('organizationId') organizationId: string,
    @CurrentUser() user: { userId: string },
    @Query() query: ListMessagesDto,
  ) {
    const isMember = await this.messageService.isActiveMember(user.userId, organizationId)
    if (!isMember) throw new ForbiddenException("Vous n'êtes pas membre de ce projet")
    return this.messageService.listMessages(organizationId, { before: query.before })
  }
}