// =============================================================================
// UserProfilePage.tsx : profil PUBLIC d'un autre utilisateur.
// Accessible depuis un avatar sur la page Amis et depuis la liste des membres
// d'un projet.
//
// PERIMETRE ASSUME : le backend n'expose ni GET /users/:id ni la liste des
// projets d'autrui. La fiche est donc reconstituee depuis l'annuaire, et la
// liste des projets se limite a CEUX QUE NOUS PARTAGEONS — croisement de mes
// propres projets avec leurs membres. C'est aussi la bonne semantique : on ne
// devoile pas les projets de quelqu'un a qui n'y participe pas.
// =============================================================================

import { useEffect, useState } from 'react'
import { Link, useParams, Navigate } from 'react-router-dom'
import {
  listOrganizationMembers, listOrganizations, listTasks, listUsers,
} from '../api'
import type { Organization, PublicUser, Task } from '../api'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/ui/Card'
import PageHeading from '../components/ui/PageHeading'
import ProjectDot from '../components/ui/ProjectDot'
import EmptyState from '../components/ui/EmptyState'
import { colorForId } from '../lib/projectColors'
import { formatLongDate } from '../lib/dates'

export default function UserProfilePage() {
  const { userId } = useParams<{ userId: string }>()
  const { accessToken, user: me } = useAuth()

  const [person, setPerson] = useState<PublicUser | null>(null)
  const [sharedOrgs, setSharedOrgs] = useState<Organization[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    // Inutile de charger quoi que ce soit pour son propre profil : la
    // redirection ci-dessous prend le relais.
    if (!accessToken || !userId || me?.id === userId) return
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      setNotFound(false)
      try {
        // L'annuaire est la seule source publique disponible : on y retrouve la
        // personne par son identifiant.
        const directory = await listUsers(accessToken!)
        if (cancelled) return
        const found = directory.find((u) => u.id === userId) ?? null
        if (!found) {
          setNotFound(true)
          return
        }
        setPerson(found)

        // Projets en commun : pour chacun des miens, on regarde si la personne
        // en est membre. Le nombre de requetes est borne par MON nombre de
        // projets, et elles partent toutes en parallele.
        const mine = await listOrganizations(accessToken!)
        if (cancelled) return
        const memberships = await Promise.all(
          mine.map((o) => listOrganizationMembers(accessToken!, o.id)),
        )
        if (cancelled) return
        const shared = mine.filter((_, i) => memberships[i].some((m) => m.user.id === userId))
        setSharedOrgs(shared)

        // Les taches ne sont chargees que pour les projets partages : elles ne
        // servent qu'au compteur affiche sur chaque carte.
        const perOrg = await Promise.all(shared.map((o) => listTasks(accessToken!, o.id)))
        if (cancelled) return
        setTasks(perOrg.flat())
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'erreur inconnue')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [accessToken, userId, me?.id])

  // Son propre profil : la page personnelle est plus complete (avatar, mot de
  // passe, 2FA). On y renvoie plutot que d'afficher une fiche appauvrie.
  if (userId && me?.id === userId) return <Navigate to="/profil" replace />

  if (loading) return <p className="text-ink-soft">Chargement…</p>
  if (notFound) {
    return (
      <EmptyState
        title="Utilisateur introuvable"
        description="Ce compte n’existe plus, ou n’est pas visible depuis votre annuaire."
        illustration="search"
        action={<Link to="/amis" className="text-link">Retour aux amis</Link>}
      />
    )
  }
  if (error) return <p className="text-danger">{error}</p>
  if (!person) return null

  return (
    <>
      <PageHeading title={person.displayName} />

      <div className="grid gap-4 max-w-[560px]">
        {/* Fiche d'identite, meme composition que la carte de la page Profil. */}
        <Card>
          <div className="flex items-center gap-4">
            {person.avatarUrl ? (
              <img src={person.avatarUrl} alt="" className="size-16 rounded-full object-cover shrink-0" />
            ) : (
              <span className="grid place-items-center size-16 rounded-full bg-sunk text-ink-soft text-xl font-semibold shrink-0">
                {person.displayName.charAt(0).toUpperCase()}
              </span>
            )}
            <div className="min-w-0">
              <div className="font-medium truncate">{person.displayName}</div>
              {/* Le username porte le suffixe genere par le backend : c'est lui
                  qui distingue deux homonymes. */}
              <div className="font-data text-[12.5px] text-ink-soft truncate">{person.username}</div>
              <div className="font-data text-[12.5px] text-ink-soft truncate">
                Inscrit le {formatLongDate(person.createdAt)}
              </div>
            </div>
          </div>
        </Card>

        <section>
          <h2 className="text-xl font-semibold mb-3">Projets en commun</h2>
          {sharedOrgs.length === 0 ? (
            <EmptyState
              title="Aucun projet en commun"
              description="Seuls les projets auxquels vous participez tous les deux apparaissent ici."
              illustration="none"
            />
          ) : (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
              {sharedOrgs.map((o) => {
                // Meme compteur que sur le tableau de bord : taches non terminees.
                const count = tasks.filter((t) => t.organizationId === o.id && t.status !== 'DONE').length
                return (
                  <Link
                    key={o.id}
                    to={`/projets/${o.id}`}
                    className="flex items-center gap-2 bg-surface border border-rule rounded-xl p-4 no-underline text-ink hover:border-ink-faint"
                  >
                    <ProjectDot color={colorForId(o.id)} label={o.name} />
                    <span className="font-medium truncate flex-1">{o.name}</span>
                    <span className="font-data text-[12px] text-ink-soft tabular-nums shrink-0">{count}</span>
                  </Link>
                )
              })}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
