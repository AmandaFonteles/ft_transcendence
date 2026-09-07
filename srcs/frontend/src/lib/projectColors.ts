// Traduit un numero de projet (1 a 6) en classe Tailwind.
// Tailwind ne genere que les classes ecrites en toutes lettres dans le source :
// une classe construite dynamiquement (`bg-project-${n}`) n'est jamais detectee
// et la couleur manque au rendu, sans la moindre erreur. D'ou la table explicite.

export type ProjectColor = 1 | 2 | 3 | 4 | 5 | 6

export const projectBg: Record<ProjectColor, string> = {
  1: 'bg-project-1',
  2: 'bg-project-2',
  3: 'bg-project-3',
  4: 'bg-project-4',
  5: 'bg-project-5',
  6: 'bg-project-6',
}

export const projectColors: ProjectColor[] = [1, 2, 3, 4, 5, 6]

// Le backend ne stocke pas de couleur de projet : on la derive du cuid de facon
// deterministe, donc identique sur toutes les machines et sans stockage.
export function colorForId(id: string): ProjectColor {
  let sum = 0
  for (let i = 0; i < id.length; i++) sum += id.charCodeAt(i)
  return ((sum % 6) + 1) as ProjectColor
}
