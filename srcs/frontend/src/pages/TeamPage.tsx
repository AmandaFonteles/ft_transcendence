// =============================================================================
// TeamPage.tsx : annuaire des utilisateurs, avec recherche.
// La liste vient de GET /api/users. Les fonctions "amis" et "chat" prevues par
// la structure n'ont pas encore de route backend : elles sont signalees comme
// emplacements a construire.
// =============================================================================

import { useEffect, useMemo, useState } from 'react'
import { listUsers } from '../api'
import type { PublicUser } from '../api'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import SeamBlock from '../components/ui/SeamBlock'
import EmptyState from '../components/ui/EmptyState'
import PageHeading from '../components/ui/PageHeading'

export default function TeamPage() {
  const { accessToken, user: me } = useAuth()
  const [users, setUsers] = useState<PublicUser[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Charge l'annuaire au montage.
  useEffect(() => {
    if (!accessToken) return
    let cancelled = false
    listUsers(accessToken)
      .then((list) => { if (!cancelled) setUsers(list) })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : 'erreur inconnue') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [accessToken])

  // [CONCEPT: useMemo] Le filtrage ne se recalcule que si la liste ou la
  // recherche changent, pas a chaque frappe non pertinente.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return users
    // Recherche sur le nom affiche et l'identifiant public uniquement.
    // L'e-mail n'est volontairement plus exposé par l'API : on ne peut donc plus
    // chercher dessus, et c'est voulu (donnee personnelle).
    return users.filter((u) =>
      u.displayName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q),
    )
  }, [users, query])

  if (loading) return <p className="text-ink-soft">Chargement…</p>

  return (
    <>
      <PageHeading title="Équipe" subtitle={`${users.length} personne${users.length > 1 ? 's' : ''}`} />

      <div className="max-w-[380px] mb-4">
        <TextField
          label="Rechercher"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nom ou identifiant"
        />
      </div>

      {error && <p className="text-danger mb-4">{error}</p>}

      {filtered.length === 0 ? (
        <EmptyState title="Aucun résultat" description="Essayez un autre terme de recherche." />
      ) : (
        <div className="grid gap-2 mb-8">
          {filtered.map((u) => (
            <Card key={u.id}>
              <div className="flex items-center gap-3">
                {u.avatarUrl ? (
                  <img src={u.avatarUrl} alt="" className="size-9 rounded-full object-cover shrink-0" />
                ) : (
                  <span className="grid place-items-center size-9 rounded-full bg-sunk text-ink-soft text-sm font-semibold shrink-0">
                    {u.displayName.charAt(0).toUpperCase()}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">
                    {u.displayName}
                    {/* Marque discretement sa propre fiche. */}
                    {me?.id === u.id && <span className="ml-2 text-[12px] text-ink-faint">(vous)</span>}
                  </div>
                  <div className="font-data text-[12.5px] text-ink-soft truncate">{u.username}</div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <h2 className="text-xl font-semibold mb-3">Amis et messagerie</h2>
      <SeamBlock owner="Modules amis et chat · Qu">
        Ajout d'amis, demandes en attente et ouverture d'une conversation depuis
        cette liste. Le schéma prévoit la relation d'amitié (commentaire
        <code className="mx-1">// Add friendship</code> dans <code>schema.prisma</code>)
        mais aucune route n'est encore exposée.
      </SeamBlock>

      <h2 className="text-xl font-semibold mt-8 mb-3">Vue administrateur</h2>
      <SeamBlock owner="Module permissions · Am">
        Liste de tous les utilisateurs, droits de chacun et projets associés.
        Nécessite une notion d'administrateur global, absente du modèle actuel.
      </SeamBlock>
    </>
  )
}
