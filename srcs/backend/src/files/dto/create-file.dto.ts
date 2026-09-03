import { IsOptional, IsString, IsEnum } from 'class-validator';
import {VisibilityPolicy} from '@prisma/client'

export class CreateFileDto {
  @IsOptional()
  @IsString()
  description?: string;
  
  @IsOptional()
  @IsEnum(VisibilityPolicy)
  visibilityPolicy?: VisibilityPolicy;
}