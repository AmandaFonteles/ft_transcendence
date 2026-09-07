// Illustration d'accueil, en SVG inline : pas de requete reseau, et le dessin
// suit les variables du theme (impossible avec un PNG).
// Le motif reproduit la structure reelle du tableau de bord : un bandeau de sept
// jours, puis des lignes de tache portant l'arete coloree de leur projet.

// Couleurs purement decoratives, sans lien avec de vrais projets.
const rowAccents = ['var(--color-project-1)', 'var(--color-project-3)', 'var(--color-project-4)', 'var(--color-project-5)']

export default function HeroIllustration({ className = '' }: { className?: string }) {
  // Sept colonnes de largeur egale sur la largeur utile de la carte (8 a 312).
  const gridLeft = 8
  const gridWidth = 304
  const colWidth = gridWidth / 7
  // Jour "courant" mis en avant, comme sur le vrai bandeau de semaine.
  const todayCol = 2

  return (
    <svg
      viewBox="0 0 320 200"
      className={className}
      // Purement decoratif : aria-hidden l'exclut de l'arbre d'accessibilite pour
      // ne pas polluer la lecture d'ecran avec une image sans contenu utile.
      // Purement decoratif : exclu de l'arbre d'accessibilite.
      aria-hidden="true"
      focusable="false"
    >
      {/* Fond de carte. */}
      <rect x="8" y="8" width="304" height="184" rx="12"
        fill="var(--color-surface)" stroke="var(--color-rule)" />

      {/* --- Bandeau de semaine (7 jours) --- */}
      {/* rx arrondit les quatre coins ; le rect suivant en carre le bas, ne
          laissant la rondeur qu'en haut, le long du contour de la carte. */}
      <rect x="8" y="8" width="304" height="38" rx="12" fill="var(--color-sunk)" />
      <rect x="8" y="20" width="304" height="26" fill="var(--color-sunk)" />

      {[0, 1, 2, 3, 4, 5, 6].map((i) => {
        const x = gridLeft + i * colWidth
        const isToday = i === todayCol
        return (
          <g key={i}>
            {i > 0 && <line x1={x} y1="8" x2={x} y2="192" stroke="var(--color-rule)" />}
            {/* Petit trait figurant l'abreviation du jour. */}
            <rect x={x + colWidth / 2 - 6} y="16" width="12" height="3" rx="1.5"
              fill="var(--color-ink-soft)" opacity={isToday ? 0.6 : 0.3} />
            {/* Pastille du jour : encre pleine pour "aujourd'hui", jamais coloree —
                les couleurs restent aux projets. */}
            {isToday ? (
              <circle cx={x + colWidth / 2} cy="30" r="7" fill="var(--color-ink)" />
            ) : (
              <circle cx={x + colWidth / 2} cy="30" r="1.5" fill="var(--color-ink-faint)" />
            )}
          </g>
        )
      })}

      {/* --- Liste de taches, chacune avec l'arete coloree de son projet --- */}
      {[
        { w: 150, accent: 0 },
        { w: 190, accent: 1 },
        { w: 120, accent: 2 },
        { w: 165, accent: 3 },
      ].map((row, i) => {
        const y = 54 + i * 30
        return (
          <g key={i}>
            {/* Meme silhouette que TaskRow. */}
            <rect x="18" y={y} width="284" height="24" rx="7"
              fill="var(--color-surface)" stroke="var(--color-rule)" />
            <rect x="18" y={y} width="4" height="24" rx="2" fill={rowAccents[row.accent]} />
            <rect x="32" y={y + 6} width={row.w} height="5" rx="2.5" fill="var(--color-ink)" opacity="0.45" />
            <rect x="32" y={y + 15} width={row.w * 0.4} height="4" rx="2" fill="var(--color-ink)" opacity="0.2" />
            <rect x="270" y={y + 7} width="22" height="10" rx="5" fill={rowAccents[row.accent]} opacity="0.25" />
          </g>
        )
      })}
    </svg>
  )
}
