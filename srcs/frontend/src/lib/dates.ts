// Formatage des dates pour toute l'application : le backend renvoie des chaines
// ISO, l'interface affiche du francais.

// --- Affichage --------------------------------------------------------------

export function formatDay(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Une tache terminee n'est jamais "en retard" : c'est a l'appelant de le verifier.
export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate).getTime() < Date.now()
}

// --- Cles et grilles de calendrier ------------------------------------------

// "AAAA-MM-JJ" : cette forme se trie alphabetiquement dans le bon ordre
// chronologique, ce qui evite toute comparaison de dates.
export function dayKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 42 cases fixes (6 semaines) : la hauteur du calendrier ne saute pas d'un mois
// a l'autre, et les jours des mois voisins restent visibles.
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1)
  // getDay() renvoie 0 pour dimanche : on decale pour que lundi vaille 0.
  const offset = (first.getDay() + 6) % 7
  const start = new Date(year, month, 1 - offset)
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

export function weekGrid(date: Date): Date[] {
  const offset = (date.getDay() + 6) % 7
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset)
  return Array.from({ length: 7 }, (_, i) =>
    new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
  )
}

export function isSameDay(a: Date, b: Date): boolean {
  return dayKey(a) === dayKey(b)
}

// --- Etat d'une tache a une date donnee -------------------------------------

// Commencee au jour J si elle n'a pas de date de debut, ou si son debut precede
// la FIN du jour J : sinon une tache demarrant a 14h n'apparaitrait pas le matin.
export function hasStartedOn(startDate: string | null, day: Date): boolean {
  if (!startDate) return true
  const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999)
  return new Date(startDate).getTime() <= endOfDay.getTime()
}

export function startsAfter(startDate: string | null, day: Date): boolean {
  if (!startDate) return false
  return !hasStartedOn(startDate, day)
}

// --- Conversion pour les formulaires ----------------------------------------

// Format attendu par <input type="date"> ; chaine vide laisse le champ vierge.
export function toDateInput(iso: string | null): string {
  if (!iso) return ''
  return dayKey(iso)
}

export function formatLongDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}
