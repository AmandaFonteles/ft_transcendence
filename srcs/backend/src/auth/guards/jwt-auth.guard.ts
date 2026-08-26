// [CONCEPT: guard] Un guard decide si une requete a le droit d'entrer dans le controller.
// Ici on delegue entierement a la strategie 'jwt' declaree au-dessus.

import { Injectable } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}