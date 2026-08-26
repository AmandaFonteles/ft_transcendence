// [CONCEPT: strategie Passport] Une "strategy" decrit COMMENT extraire et verifier
// un token. Nest l'utilise automatiquement des qu'un guard AuthGuard('jwt') est pose
// sur une route (voir jwt-auth.guard.ts).

import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      // Le token est attendu dans le header : "Authorization: Bearer <token>".
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      // Meme secret que celui utilise pour SIGNER l'access token dans AuthService.
      secretOrKey: process.env.JWT_ACCESS_SECRET,
      // Rejette automatiquement les tokens expires (sinon il faudrait le verifier a la main).
      ignoreExpiration: false
    })
  }

  // Appele par Passport UNE FOIS la signature et l'expiration verifiees.
  // Ce qu'on retourne ici devient "req.user" dans les controllers.
  async validate(payload: { sub: string }) {
    // On ne recharge PAS le user depuis la DB ici (pour rester rapide/stateless) :
    // on fait confiance a un token valide. Si tu veux verifier que le compte
    // existe toujours a CHAQUE requete, c'est ici qu'il faudrait ajouter l'appel Prisma.
    return { userId: payload.sub }
  }
}