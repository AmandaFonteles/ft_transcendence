// [CONCEPT: decorateur de parametre custom] Permet d'ecrire
// findMe(@CurrentUser() user) au lieu de findMe(@Req() req) puis req.user.

import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    // Rempli par JwtStrategy.validate() ci-dessus.
    return request.user as { userId: string }
  }
)