import { IsISO8601, IsOptional } from 'class-validator'

// Curseur de pagination du chat : le createdAt du plus ancien message deja charge.
// Sans validation, "?before=nimportequoi" produisait un "new Date(...)" invalide
// que Prisma refusait avec une erreur 500 illisible. @IsISO8601 le transforme en
// 400 explicite, cote client comme cote evaluateur qui teste l'API a la main.
export class ListMessagesDto {
  @IsOptional()
  @IsISO8601({}, { message: 'le curseur "before" doit etre une date ISO 8601' })
  before?: string
}
