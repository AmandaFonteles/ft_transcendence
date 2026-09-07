// [CONCEPT: DTO de securite] currentPassword est OBLIGATOIRE (pas de @IsOptional) :
// on ne change JAMAIS un mot de passe sans reverifier l'ancien, meme si la requete
// porte deja un access token valide. Pourquoi : un access token vole (XSS, session
// laissee ouverte...) ne doit pas suffire a lui seul pour prendre le controle total
// du compte en changeant le mot de passe.

import { IsString, MaxLength, MinLength } from 'class-validator'
import { LIMITS } from '../../common/validation'

export class ChangePasswordDto {
  // Meme raisonnement qu'au login : pas de minimum revelateur sur l'ANCIEN mot de
  // passe, mais un maximum pour borner le cout d'argon2.verify().
  @IsString()
  @MinLength(1)
  @MaxLength(LIMITS.PASSWORD_MAX)
  currentPassword: string

  // Le NOUVEAU, lui, doit respecter la politique complete : c'est une creation,
  // exactement comme au signup.
  @IsString()
  @MinLength(LIMITS.PASSWORD_MIN, {
    message: `le mot de passe doit contenir au moins ${LIMITS.PASSWORD_MIN} caracteres`,
  })
  @MaxLength(LIMITS.PASSWORD_MAX, {
    message: `le mot de passe ne peut pas depasser ${LIMITS.PASSWORD_MAX} caracteres`,
  })
  newPassword: string
}
