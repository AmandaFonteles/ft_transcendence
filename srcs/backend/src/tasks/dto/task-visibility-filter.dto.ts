import { ArrayMaxSize, IsBoolean, IsOptional, Matches } from 'class-validator'
import { Transform } from 'class-transformer'
import { LIMITS, RESOURCE_ID_PATTERN } from '../../common/validation'

// [CONCEPT: parametres de requete] Tout ce qui arrive dans une URL est une CHAINE :
// "?owned=true" donne la chaine "true", pas le booleen. D'ou les @Transform, qui
// s'executent avant les validateurs (transform: true dans le ValidationPipe).
export class TaskVisibilityFilterDto {
	// Une valeur autre que "true"/"false" est laissee telle quelle et echoue alors
	// sur @IsBoolean : "?owned=peutetre" repond 400, il ne passe pas en silence.
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
	// PLAFOND SUR LE NOMBRE D'ELEMENTS : sans lui, "?assignedUserIds=a,b,c,..."
	// repete des milliers de fois se traduirait en une clause SQL "IN (...)" geante,
	// construite a la demande d'un client anonyme. La borne rend le cout previsible.
	@ArrayMaxSize(LIMITS.FILTER_IDS_MAX, {
		message: `pas plus de ${LIMITS.FILTER_IDS_MAX} identifiants par filtre`,
	})
	// "each: true" applique la regle a CHAQUE element du tableau : un seul
	// identifiant malforme suffit a refuser la requete.
	@Matches(RESOURCE_ID_PATTERN, { each: true, message: 'identifiant invalide dans le filtre' })
	assignedUserIds?: string[]

	@Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value)
	@IsOptional()
	@IsBoolean()
	unassigned?: boolean
}
