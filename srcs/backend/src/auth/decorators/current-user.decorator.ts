// Permet d'ecrire findMe(@CurrentUser() user) au lieu de @Req() puis req.user.
import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    return request.user as { userId: string }
  }
)