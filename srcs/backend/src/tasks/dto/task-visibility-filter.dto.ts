import { IsOptional, IsBoolean, IsString } from 'class-validator'
import { Transform } from 'class-transformer'

export class TaskVisibilityFilterDto {
	@Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
	@IsOptional()
	@IsBoolean()
	owned?: boolean

	// @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
	// @IsOptional()
	// @IsBoolean()
	// assignedToMe?: boolean

	@Transform(({ value }) => {
	if (value === undefined)
		return undefined
	if (value === '')
		return []

	if (Array.isArray(value))
		return value
	return value.split(',')
	})
	@IsOptional()
	@IsString({ each: true })
	assignedUserIds?: string[]

	@Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
	@IsOptional()
	@IsBoolean()
	unassigned?: boolean
}