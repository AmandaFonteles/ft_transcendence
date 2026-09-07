import { MaxLength, MinLength } from 'class-validator'
import { LIMITS, Trim } from '../../common/validation'

export class SendFriendRequestDto {
  // Un username genere fait au plus 50 + 1 + 5 caracteres : au-dela, la valeur ne
  // correspondra jamais a personne. Le trim absorbe les espaces d'un copier-coller.
  @Trim()
  @MinLength(1, { message: 'nom d\'utilisateur requis' })
  @MaxLength(LIMITS.USERNAME_MAX, { message: 'nom d\'utilisateur invalide' })
  username: string
}
