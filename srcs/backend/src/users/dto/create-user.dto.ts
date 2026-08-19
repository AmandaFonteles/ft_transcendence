// [CONCEPT: DTO] Data Transfer Object = la FORME des donnees attendues en entree.
// Ici une simple interface : elle type le corps de la requete a la COMPILATION.
// Pourquoi un fichier separe : le controller ET le service partagent le meme type
// sans le dupliquer (dupliquer un type a deux endroits = source de divergence).
// Extension future (Qu) : transformer cette interface en CLASSE avec des decorateurs
// class-validator (@IsEmail, @IsString...) + un ValidationPipe, pour valider A L'EXECUTION.
export interface CreateUserDto {
  // Email de connexion (contrainte @unique en base).
  email: string
  // Handle public court (contrainte @unique en base).
  username: string
  // Nom affiche dans l'UI.
  displayName: string
  // Avatar OPTIONNEL ("?" => le champ peut etre absent), comme dans schema.prisma.
  avatarUrl?: string
}
