import { IsString, MaxLength, MinLength } from 'class-validator'
import { LIMITS } from '../../common/validation'

// currentPassword est obligatoire : un access token vole ne doit pas suffire a
// prendre le controle du compte en changeant le mot de passe.
export class ChangePasswordDto {
  // Pas de minimum revelateur sur l'ancien mot de passe, mais un maximum pour
  // borner le cout d'argon2.verify().
  @IsString()
  @MinLength(1)
  @MaxLength(LIMITS.PASSWORD_MAX)
  currentPassword: string

  @IsString()
  @MinLength(LIMITS.PASSWORD_MIN, {
    message: `le mot de passe doit contenir au moins ${LIMITS.PASSWORD_MIN} caracteres`,
  })
  @MaxLength(LIMITS.PASSWORD_MAX, {
    message: `le mot de passe ne peut pas depasser ${LIMITS.PASSWORD_MAX} caracteres`,
  })
  newPassword: string
}
