import type { TaskStatus } from '../api'

// Traduction et apparence des statuts de tache (enum Prisma TaskStatus).

export const statusLabel: Record<TaskStatus, string> = {
  NOT_STARTED: 'À faire',
  IN_PROGRESS: 'En cours',
  DONE: 'Terminée',
}

export const statusOrder: TaskStatus[] = ['NOT_STARTED', 'IN_PROGRESS', 'DONE']

// Classes ecrites en toutes lettres (piege du scan Tailwind, voir projectColors).
// Le statut utilise des neutres et le signal "danger", jamais une couleur de
// projet : melanger les deux systemes les viderait de leur sens.
export const statusBadge: Record<TaskStatus, string> = {
  NOT_STARTED: 'bg-sunk text-ink-soft',
  IN_PROGRESS: 'bg-surface text-ink border border-rule',
  DONE: 'bg-success-bg text-success',
}
