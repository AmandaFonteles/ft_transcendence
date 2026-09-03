// =============================================================================
// dates.ts : formatage des dates, au meme endroit pour toute l'application.
// Le backend renvoie des chaines ISO ("2026-03-12T10:00:00.000Z") ; l'interface
// doit afficher du francais lisible.
// =============================================================================

// Formate une date ISO en "12 mars", ou "—" si la date est absente.
export function formatDay(iso: string | null): string {
  if (!iso) return '—'
  // toLocaleDateString avec la locale francaise : le navigateur gere les noms de mois.
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
}

// Indique si une echeance est depassee.
// Une tache terminee n'est jamais "en retard" : c'est a l'appelant de le verifier.
export function isOverdue(dueDate: string | null): boolean {
  if (!dueDate) return false
  return new Date(dueDate).getTime() < Date.now()
}

// Renvoie la cle "AAAA-MM-JJ" d'une date ISO, utilisee pour regrouper les taches
// par jour dans l'agenda. Pourquoi cette forme : elle se trie alphabetiquement
// dans le bon ordre chronologique, ce qui evite toute comparaison de dates.
export function dayKey(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso
  // padStart garantit "03" et non "3", indispensable pour que le tri fonctionne.
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// Construit la grille d'un mois : 6 semaines de 7 jours, en commencant un lundi.
// Pourquoi 42 cases fixes : la hauteur du calendrier ne saute pas d'un mois a
// l'autre, et les jours des mois voisins restent visibles en grise.
export function monthGrid(year: number, month: number): Date[] {
  // Premier jour du mois demande.
  const first = new Date(year, month, 1)
  // getDay() renvoie 0 pour dimanche : on decale pour que lundi vaille 0.
  const offset = (first.getDay() + 6) % 7
  // Recule jusqu'au lundi qui ouvre la grille.
  const start = new Date(year, month, 1 - offset)
  // Genere 42 jours consecutifs a partir de ce lundi.
  return Array.from({ length: 42 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
}

// Renvoie les 7 jours de la semaine (lundi -> dimanche) contenant la date donnee.
// Pourquoi lundi : usage francais, coherent avec la grille du mois.
export function weekGrid(date: Date): Date[] {
  // getDay() renvoie 0 pour dimanche : on decale pour que lundi vaille 0.
  const offset = (date.getDay() + 6) % 7
  // Recule jusqu'au lundi de cette semaine.
  const monday = new Date(date.getFullYear(), date.getMonth(), date.getDate() - offset)
  return Array.from({ length: 7 }, (_, i) =>
    new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
  )
}

// Compare deux dates au JOUR pres, en ignorant l'heure.
export function isSameDay(a: Date, b: Date): boolean {
  // On compare la cle "AAAA-MM-JJ" : plus sur qu'une soustraction de timestamps,
  // qui echouerait des que les heures different.
  return dayKey(a) === dayKey(b)
}

// [CONCEPT: "deja commencee" a une date donnee]
// Une tache est consideree commencee au jour J si elle n'a pas de date de debut
// (donc active des sa creation) ou si son debut est anterieur ou egal a la FIN
// du jour J. On compare a la fin du jour et non a l'instant present : sinon une
// tache demarrant a 14h n'apparaitrait pas le matin meme, ce qui est contre-intuitif.
export function hasStartedOn(startDate: string | null, day: Date): boolean {
  if (!startDate) return true
  // 23:59:59.999 du jour considere.
  const endOfDay = new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999)
  return new Date(startDate).getTime() <= endOfDay.getTime()
}

// Indique si une tache demarre APRES le jour donne (donc encore a venir).
export function startsAfter(startDate: string | null, day: Date): boolean {
  if (!startDate) return false
  return !hasStartedOn(startDate, day)
}

// Convertit une date ISO en "AAAA-MM-JJ", format attendu par <input type="date">.
// Renvoie une chaine vide si la date est absente, ce qui laisse le champ vierge.
export function toDateInput(iso: string | null): string {
  if (!iso) return ''
  return dayKey(iso)
}

// Formate une date en toutes lettres : "jeudi 12 mars 2026".
// Reserve aux vues de detail, ou la place ne manque pas.
export function formatLongDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}
