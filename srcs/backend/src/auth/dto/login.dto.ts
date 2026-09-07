import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { LIMITS, Trim } from '../../common/validation'

// Plus permissif que SignupDto sur le mot de passe : pas de @MinLength(8), une
// regle de longueur au login renseignerait un attaquant sur la politique.
export class LoginDto {
  @Trim()
  @IsEmail({}, { message: 'identifiants invalides' })
  @MaxLength(LIMITS.EMAIL_MAX)
  email: string

  // Le maximum, lui, protege argon2.verify() d'un mot de passe geant envoye en
  // boucle, sans rien reveler.
  @IsString()
  @MinLength(1, { message: 'identifiants invalides' })
  @MaxLength(LIMITS.PASSWORD_MAX, { message: 'identifiants invalides' })
  password: string

  @IsOptional()
  @Trim()
  @Matches(/^\d{6}$/, { message: 'le code doit contenir exactement 6 chiffres' })
  totpCode?: string
}
