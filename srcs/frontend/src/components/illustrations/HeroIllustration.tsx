// =============================================================================
// HeroIllustration.tsx : illustration d'accueil.
//
// SVG INLINE plutot qu'un fichier image, pour trois raisons :
//   - aucune requete reseau supplementaire ;
//   - le dessin utilise les VARIABLES DU THEME, donc il suit automatiquement la
//     charte si les couleurs changent (impossible avec un PNG) ;
//   - il reste net a toutes les tailles d'ecran.
//
// Motif : reproduit la VRAIE structure du tableau de bord (DashboardPage) —
// un bandeau de 7 jours en tete, puis une liste de taches dont chacune porte
// l'arete coloree de son projet (voir TaskRow) — plutot qu'une grille generique
// de barres colorees qui ne ressemblait a aucun ecran reel de l'application.
// =============================================================================

// Couleurs de projet utilisees pour les aretes, dans l'ordre ou elles
// apparaissent dans les lignes (purement decoratif, aucun lien avec de vrais
// projets).
const rowAccents = ['var(--color-project-1)', 'var(--color-project-3)', 'var(--color-project-4)', 'var(--color-project-5)']

export default function HeroIllustration({ className = '' }: { className?: string }) {
  // 7 colonnes de largeur egale sur la largeur utile de la carte (8 a 312).
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
      aria-hidden="true"
      focusable="false"
    >
      {/* Fond de carte. */}
      <rect x="8" y="8" width="304" height="184" rx="12"
        fill="var(--color-surface)" stroke="var(--color-rule)" />

      {/* --- Bandeau de semaine (7 jours), comme en tete de DashboardPage ---
          rx arrondit les 4 coins ; le rect suivant en carre le bas, ne laissant
          la rondeur qu'en haut, la ou elle suit le contour de la carte. */}
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
            {/* Pastille du jour : pleine (encre) pour "aujourd'hui", comme sur le
                vrai bandeau, jamais coloree — les couleurs restent aux projets. */}
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
            {/* Carte de la ligne, meme silhouette que TaskRow (bord + coins ronds). */}
            <rect x="18" y={y} width="284" height="24" rx="7"
              fill="var(--color-surface)" stroke="var(--color-rule)" />
            {/* Arete coloree du projet, etiree sur toute la hauteur de la ligne. */}
            <rect x="18" y={y} width="4" height="24" rx="2" fill={rowAccents[row.accent]} />
            {/* Titre (trait plein) et metadonnee (trait plus clair, plus court). */}
            <rect x="32" y={y + 6} width={row.w} height="5" rx="2.5" fill="var(--color-ink)" opacity="0.45" />
            <rect x="32" y={y + 15} width={row.w * 0.4} height="4" rx="2" fill="var(--color-ink)" opacity="0.2" />
            {/* Pastille de statut, a droite, comme le badge de TaskRow. */}
            <rect x="270" y={y + 7} width="22" height="10" rx="5" fill={rowAccents[row.accent]} opacity="0.25" />
          </g>
        )
      })}
    </svg>
  )
}
