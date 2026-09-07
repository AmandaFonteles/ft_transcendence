// [CONCEPT: DTO valide] Volontairement plus permissif que SignupDto sur le mot de
// passe : PAS de @MinLength(8) ici. Une regle de longueur au LOGIN renseignerait
// un attaquant sur la politique de mots de passe (il saurait quelles combinaisons
// ne valent pas la peine d'etre essayees). On verifie seulement que le champ est
// present et d'une taille raisonnable.

import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator'
import { LIMITS, Trim } from '../../common/validation'

export class LoginDto {
  @Trim()
  @IsEmail({}, { message: 'identifiants invalides' })
  @MaxLength(LIMITS.EMAIL_MAX)
  email: string

  // Le MAXIMUM, lui, reste indispensable : c'est ici qu'on protege argon2.verify()
  // d'un mot de passe geant envoye en boucle. Il ne revele rien (personne n'a un
  // mot de passe de 128 caracteres a deviner).
  @IsString()
  @MinLength(1, { message: 'identifiants invalides' })
  @MaxLength(LIMITS.PASSWORD_MAX, { message: 'identifiants invalides' })
  password: string

  // Code TOTP : exactement six CHIFFRES. @Length(6, 6) laissait passer "abcdef",
  // qui partait alors jusqu'a la verification cryptographique pour rien.
  @IsOptional()
  @Trim()
  @Matches(/^\d{6}$/, { message: 'le code doit contenir exactement 6 chiffres' })
  totpCode?: string
}
