import { IsOptional, IsString, IsEnum, IsNotEmpty } from 'class-validator';
import {VisibilityPolicy} from '@prisma/client'

export class UpdateFileDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;
  
  @IsOptional()
  @IsEnum(VisibilityPolicy)
  visibilityPolicy?: VisibilityPolicy;
}