import { IsResourceId } from '../../common/validation'

export class AddMemberDto {
  // Forme d'identifiant verifiee, et pas seulement "chaine non vide" : une valeur
  // qui ne PEUT PAS etre un cuid n'a rien a faire dans une requete base.
  // On la refuse en 400 explicite plutot que de laisser le service repondre 404
  // apres etre alle chercher pour rien.
  @IsResourceId()
  userId: string
}
