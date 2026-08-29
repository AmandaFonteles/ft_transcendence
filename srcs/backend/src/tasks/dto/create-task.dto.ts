import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDateString } from 'class-validator'

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsOptional()
  description?: string

  @IsDateString()
  @IsOptional()
  startDate?: string

  @IsDateString()
  @IsOptional()
  dueDate?: string

  @IsBoolean()
  @IsOptional()
  assignToSelf?: boolean
}