// =============================================================================
// projectColors.ts : traduit un numero de projet (1 a 6) en classe Tailwind.
// =============================================================================

// [CONCEPT: le piege du scan de classes Tailwind]
// Tailwind ne genere que les classes qu'il TROUVE ECRITES EN TOUTES LETTRES dans
// le code source. Une classe construite dynamiquement, comme :
//     `bg-project-${n}`          <-- NE MARCHE PAS
// n'est jamais detectee : la couleur sera simplement absente au rendu, sans la
// moindre erreur. C'est le piege Tailwind le plus courant.
// La parade : une table de correspondance ou chaque classe est ECRITE ENTIEREMENT.

// Type des numeros de projet acceptes. Restreindre le type evite qu'un appelant
// passe 7 et obtienne une couleur manquante silencieusement.
export type ProjectColor = 1 | 2 | 3 | 4 | 5 | 6

// Classes de FOND (arete de tache, pastilles, avatars).
export const projectBg: Record<ProjectColor, string> = {
  1: 'bg-project-1',
  2: 'bg-project-2',
  3: 'bg-project-3',
  4: 'bg-project-4',
  5: 'bg-project-5',
  6: 'bg-project-6',
}

// Classes de TEXTE, si un jour on veut colorer un libelle de projet.
export const projectText: Record<ProjectColor, string> = {
  1: 'text-project-1',
  2: 'text-project-2',
  3: 'text-project-3',
  4: 'text-project-4',
  5: 'text-project-5',
  6: 'text-project-6',
}

// Liste des numeros disponibles, pratique pour afficher un selecteur de couleur.
export const projectColors: ProjectColor[] = [1, 2, 3, 4, 5, 6]
