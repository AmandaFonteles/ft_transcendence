import { MaxLength, MinLength } from 'class-validator'
import { LIMITS, Trim } from '../../common/validation'

export class SendFriendRequestDto {
  // Un username est genere par le backend sous la forme "displayName#suffixe" :
  // il ne peut donc pas depasser 50 + 1 + 5 caracteres. Une valeur plus longue ne
  // correspondra jamais a personne — autant la refuser avant d'interroger la base.
  // Le trim absorbe les espaces d'un copier-coller, cas frequent ici puisque le
  // username se transmet de la main a la main.
  @Trim()
  @MinLength(1, { message: 'nom d\'utilisateur requis' })
  @MaxLength(LIMITS.USERNAME_MAX, { message: 'nom d\'utilisateur invalide' })
  username: string
}
