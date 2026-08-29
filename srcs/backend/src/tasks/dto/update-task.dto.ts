import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator'

export class UpdateTaskDto {
	@IsOptional()
	@IsString()
	@IsNotEmpty()
	name?: string

	@IsOptional()
	@IsString()
	description?: string | null

	@IsOptional()
	@IsDateString()
	startDate?: string | null

	@IsOptional()
	@IsDateString()
	dueDate?: string | null
}