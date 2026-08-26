// dto/signup.dto.ts
import { IsEmail, IsOptional, IsString, IsUrl, MinLength } from 'class-validator'

export class SignupDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(1)
  displayName: string

  @IsString()
  @MinLength(8)
  password: string

  @IsOptional()
  @IsUrl()
  avatarUrl?: string
}