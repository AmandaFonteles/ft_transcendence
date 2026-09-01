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

// Formate une date ISO en "12 mars, 10:00".
export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
    + ', ' + d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
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
