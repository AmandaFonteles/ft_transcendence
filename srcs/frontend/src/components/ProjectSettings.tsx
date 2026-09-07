import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteOrganization, getOrganization, listOrganizationMembers, removeMember, updateOrganization } from '../api'
import type { InvitePolicy, Organization, OrganizationMember } from '../api'
import { useAuth } from '../auth/AuthContext'
import Modal from './ui/Modal'
import Button from './ui/Button'
import TextField from './ui/TextField'
import TextArea from './ui/TextArea'
import { LIMITS } from '../lib/validation'

// Modification d'un projet (nom, description, droits), ouvert en cliquant sur le
// nom du projet. Le backend refuse deja l'operation aux non-administrateurs
// (requireAdmin) : on ne propose simplement pas l'action a qui ne peut la mener.
interface ProjectSettingsProps {
  organization: Organization
  accessToken: string
  onClose: () => void
  onUpdated: (organization: Organization) => void
}

export default function ProjectSettings({
  organization, accessToken, onClose, onUpdated,
}: ProjectSettingsProps) {
  const [name, setName] = useState(organization.name)
  const [description, setDescription] = useState(organization.description ?? '')
  const [invitePolicy, setInvitePolicy] = useState<InvitePolicy>(organization.invitePolicy)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [confirmName, setConfirmName] = useState('')
  const [deleting, setDeleting] = useState(false)

  // Permet de quitter la page apres suppression : y rester afficherait une erreur.
  const navigate = useNavigate()

  // --- Retrait de membres ---------------------------------------------------
  // Cet utilisateur est forcement administrateur : le panneau n'est ouvert que
  // pour lui (voir ProjectPage), et removeMember() est garde cote backend.

  const { user } = useAuth()
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [membersLoading, setMembersLoading] = useState(true)
  const [membersError, setMembersError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listOrganizationMembers(accessToken, organization.id)
      .then((list) => { if (!cancelled) setMembers(list) })
      .catch((err) => { if (!cancelled) setMembersError(err instanceof Error ? err.message : 'erreur inconnue') })
      .finally(() => { if (!cancelled) setMembersLoading(false) })
    return () => { cancelled = true }
  }, [accessToken, organization.id])

  async function handleRemove(targetUserId: string) {
    setRemovingId(targetUserId)
    setMembersError(null)
    try {
      await removeMember(accessToken, organization.id, targetUserId)
      setMembers((prev) => prev.filter((m) => m.user.id !== targetUserId))
    } catch (err) {
      setMembersError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setRemovingId(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await updateOrganization(accessToken, organization.id, {
        name,
        // Chaine vide envoyee comme "non fourni" : le DTO backend est @IsOptional
        // et une chaine vide echouerait sa validation.
        description: description || undefined,
        invitePolicy,
      })
      // PATCH ne renvoie qu'un accuse de reception : on relit le projet pour
      // afficher ce qui a reellement ete enregistre.
      onUpdated(await getOrganization(accessToken, organization.id))
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    setError(null)
    setDeleting(true)
    try {
      await deleteOrganization(accessToken, organization.id)
      // Redirige avant que le parent tente de recharger un projet disparu.
      // "replace" evite d'empiler une entree d'historique vers une page morte.
      navigate('/tableau-de-bord', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
      setDeleting(false)
    }
  }

  return (
    <Modal title="Modifier le projet" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <TextField
          label="Nom du projet"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={LIMITS.ORGANIZATION_NAME_MAX}
          required
        />

        <TextArea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={LIMITS.ORGANIZATION_DESCRIPTION_MAX}
        />

        <div className="grid gap-1">
          <label htmlFor="edit-invite-policy" className="text-[13.5px] text-ink-soft">
            Qui peut ajouter des membres
          </label>
          <select
            id="edit-invite-policy"
            value={invitePolicy}
            onChange={(e) => setInvitePolicy(e.target.value as InvitePolicy)}
            className="w-full bg-surface border border-rule rounded-lg px-3 py-2 text-[15px] cursor-pointer"
          >
            <option value="ADMIN_ONLY">Les administrateurs uniquement</option>
            <option value="ANY_MEMBER">Tous les membres</option>
          </select>
        </div>

        {error && <p className="text-danger text-sm">{error}</p>}

        <div className="flex gap-2">
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? 'Enregistrement…' : 'Enregistrer'}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>Annuler</Button>
        </div>
      </form>

      {/* --- Retrait de membres : hors du formulaire, chaque retrait part seul --- */}
      <div className="mt-6 pt-4 border-t border-rule">
        <h3 className="text-[13.5px] text-ink-soft mb-2">Retirer un membre</h3>

        {membersError && <p className="text-danger text-sm mb-2">{membersError}</p>}

        {membersLoading ? (
          <p className="text-ink-soft text-sm">Chargement des membres…</p>
        ) : (
          <div className="grid gap-1.5">
            {members
              // On ne se propose pas de s'exclure soi-meme : le backend le refuse,
              // "quitter le projet" est l'action prevue pour ca.
              .filter((m) => m.user.id !== user?.id)
              .map((m) => (
                <div key={m.user.id} className="flex items-center gap-3">
                  <span className="flex-1 min-w-0 truncate text-[14px]">
                    {m.user.displayName}
                    {m.role === 'ADMIN' && <span className="ml-2 text-[12px] text-ink-faint">Administrateur</span>}
                  </span>
                  <Button
                    type="button"
                    disabled={removingId === m.user.id}
                    onClick={() => handleRemove(m.user.id)}
                    className="!text-danger"
                  >
                    {removingId === m.user.id ? 'Retrait…' : 'Retirer'}
                  </Button>
                </div>
              ))}
            {members.length <= 1 && (
              <p className="font-data text-[12.5px] text-ink-soft">Aucun autre membre à retirer.</p>
            )}
          </div>
        )}
      </div>

      {/* --- Suppression du projet --- */}
      {/* Repliee par defaut : l'action destructrice doit se chercher, elle ne doit
          pas se trouver sous le curseur de quelqu'un venu renommer. */}
      <div className="mt-5 pt-4 border-t border-rule">
        {!showDelete ? (
          <Button type="button" variant="ghost" onClick={() => setShowDelete(true)}>
            Supprimer le projet
          </Button>
        ) : (
          <div className="grid gap-3">
            <p className="text-[13.5px] text-danger">
              Cette action est irréversible. Elle supprimera définitivement le projet,
              <strong> toutes ses tâches</strong>, <strong>tous ses fichiers</strong>,
              <strong> toute sa discussion</strong> et l'appartenance de
              <strong> tous ses membres</strong>.
            </p>

            {/* Confirmation par recopie du nom : plus sur qu'un simple "Confirmer". */}
            <TextField
              label={`Tapez « ${organization.name} » pour confirmer`}
              value={confirmName}
              onChange={(e) => setConfirmName(e.target.value)}
              placeholder={organization.name}
              autoComplete="off"
            />

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleDelete}
                // trim() tolere un espace colle par un copier-coller, sans plus.
                disabled={deleting || confirmName.trim() !== organization.name}
                className="!bg-danger !text-white !border-transparent"
              >
                {deleting ? 'Suppression…' : 'Supprimer définitivement'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => { setShowDelete(false); setConfirmName('') }}
              >
                Annuler
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
