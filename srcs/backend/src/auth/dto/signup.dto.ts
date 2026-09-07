// dto/signup.dto.ts
import { IsEmail, IsOptional, IsString, IsUrl, MaxLength, MinLength } from 'class-validator'
import { IsDisplayName, LIMITS, Trim } from '../../common/validation'

export class SignupDto {
  // Trim d'abord : "  a@b.c  " est une adresse valide saisie avec un espace de
  // trop, pas une adresse invalide. @IsEmail la refuserait sans le trim.
  @Trim()
  @IsEmail({}, { message: 'adresse e-mail invalide' })
  @MaxLength(LIMITS.EMAIL_MAX)
  email: string

  // Longueur bornee, pas de caractere de controle, pas de "#" (separateur du
  // username genere), et refus des chaines faites uniquement d'espaces.
  @IsDisplayName()
  displayName: string

  // MAXIMUM autant que minimum : argon2 est volontairement lent et gourmand en
  // memoire ; hacher une chaine de plusieurs megaoctets serait un deni de service
  // offert a qui poste un formulaire d'inscription.
  // Pas de trim ici : un mot de passe peut legitimement commencer ou finir par
  // un espace, et le couper changerait silencieusement ce que l'utilisateur a tape.
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
