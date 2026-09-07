// Delegue entierement a la strategie 'jwt' (voir strategies/jwt.strategy.ts).
import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}