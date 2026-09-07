import { IsEmail, IsOptional, MaxLength } from 'class-validator'
import { IsDisplayName, LIMITS, Trim } from '../../common/validation'

export class UpdateProfileDto {
  @IsOptional()
  @Trim()
  @IsEmail({}, { message: 'adresse e-mail invalide' })
  @MaxLength(LIMITS.EMAIL_MAX)
  email?: string

  @IsOptional()
  @IsDisplayName()
  displayName?: string
}
