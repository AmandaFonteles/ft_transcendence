import { ArrayMaxSize, IsBoolean, IsOptional, Matches } from 'class-validator'
import { Transform } from 'class-transformer'
import { LIMITS, RESOURCE_ID_PATTERN } from '../../common/validation'

// Tout ce qui arrive dans une URL est une chaine : "?owned=true" donne "true",
// pas le booleen. D'ou les @Transform, qui s'executent avant les validateurs.
// Une valeur autre que "true"/"false" est laissee telle quelle et echoue alors
// sur @IsBoolean, plutot que de passer en silence.
export class TaskVisibilityFilterDto {
	@Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
	@IsOptional()
	@IsBoolean()
	owned?: boolean

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
	// Plafond sur le nombre d'elements : borne la clause SQL "IN (...)" generee.
	// "each: true" applique la regle de forme a chaque identifiant du tableau.
	@ArrayMaxSize(LIMITS.FILTER_IDS_MAX, {
		message: `pas plus de ${LIMITS.FILTER_IDS_MAX} identifiants par filtre`,
	})
	@Matches(RESOURCE_ID_PATTERN, { each: true, message: 'identifiant invalide dans le filtre' })
	assignedUserIds?: string[]

	@Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
	@IsOptional()
	@IsBoolean()
	unassigned?: boolean
}
