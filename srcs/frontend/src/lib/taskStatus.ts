// =============================================================================
// taskStatus.ts : traduction et apparence des statuts de tache.
// Les valeurs viennent de l'enum Prisma TaskStatus cote backend.
// =============================================================================

import type { TaskStatus } from '../api'

// Libelle francais affiche pour chaque statut.
export const statusLabel: Record<TaskStatus, string> = {
  NOT_STARTED: 'À faire',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminée',
}

// Ordre d'affichage dans les selecteurs : suit la progression naturelle.
export const statusOrder: TaskStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'DONE']

// [CONCEPT: le piege du scan Tailwind] Les classes doivent etre ECRITES EN
// TOUTES LETTRES : une classe construite dynamiquement ne serait jamais generee,
// et la couleur disparaitrait sans la moindre erreur. D'ou cette table explicite.
// Le statut utilise des NEUTRES et le signal "danger", jamais une couleur de
// projet : les couleurs de projet sont un systeme d'identite, les melanger
// viderait les deux de leur sens.
export const statusBadge: Record<TaskStatus, string> = {
  NOT_STARTED: 'bg-sunk text-ink-soft',
  IN_PROGRESS: 'bg-surface text-ink border border-rule',
  DONE: 'bg-success-bg text-success',
}
