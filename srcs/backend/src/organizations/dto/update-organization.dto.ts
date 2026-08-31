import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator'
import {InvitePolicy} from '@prisma/client'

export class UpdateOrganizationDto {

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(InvitePolicy)
  invitePolicy?: InvitePolicy
}
