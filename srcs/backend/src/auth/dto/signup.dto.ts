import { IsEmail, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator'
import { IsDisplayName, LIMITS, Trim } from '../../common/validation'

export class SignupDto {
  // Trim d'abord : "  a@b.c  " est une adresse valide saisie avec un espace de
  // trop, qu'@IsEmail refuserait sans le trim.
  @Trim()
  @IsEmail({}, { message: 'adresse e-mail invalide' })
  @MaxLength(LIMITS.EMAIL_MAX)
  email: string

  @IsDisplayName()
  displayName: string

  // Pas de trim ici : un mot de passe peut legitimement commencer ou finir par un
  // espace, le couper changerait silencieusement ce que l'utilisateur a tape.
  @IsString()
  @MinLength(LIMITS.PASSWORD_MIN, {
    message: `le mot de passe doit contenir au moins ${LIMITS.PASSWORD_MIN} caracteres`,
  })
  @MaxLength(LIMITS.PASSWORD_MAX, {
    message: `le mot de passe ne peut pas depasser ${LIMITS.PASSWORD_MAX} caracteres`,
  })
  password: string

  @IsOptional()
  @Trim()
  @IsUrl()
  @MaxLength(2048)
  avatarUrl?: string
}
