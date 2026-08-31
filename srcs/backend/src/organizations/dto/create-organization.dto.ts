<<<<<<< HEAD
import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator'
import {InvitePolicy} from '@prisma/client'
=======
import { IsString, IsNotEmpty, IsOptional } from 'class-validator'
>>>>>>> origin/Quentin

export class CreateOrganizationDto {

  @IsString()
  @IsNotEmpty()
  name: string

  @IsOptional()
  @IsString()
  description?: string

<<<<<<< HEAD
  @IsOptional()
  @IsEnum(InvitePolicy)
  invitePolicy?: InvitePolicy
=======
>>>>>>> origin/Quentin
}