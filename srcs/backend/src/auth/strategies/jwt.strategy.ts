import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      // Token attendu dans "Authorization: Bearer <token>".
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Meme secret que celui qui signe l'access token dans AuthService.
      secretOrKey: process.env.JWT_ACCESS_SECRET,
      ignoreExpiration: false
    })
  }

  // Appele une fois la signature et l'expiration verifiees ; ce qui est retourne
  // devient req.user. On ne recharge pas le user depuis la base a chaque requete.
  async validate(payload: { sub: string }) {
    return { userId: payload.sub }
  }
}