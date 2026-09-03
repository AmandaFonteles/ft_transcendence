// =============================================================================
// ProjectSettings.tsx : modification d'un projet (nom, description, droits).
//
// Ouvert en cliquant sur le NOM du projet, et reserve aux administrateurs. Le
// backend refuse deja l'operation aux non-administrateurs (requireAdmin) ; on ne
// propose simplement pas l'action a ceux qui ne peuvent pas la mener a bien.
// =============================================================================

import { useState } from 'react'
import { getOrganization, updateOrganization } from '../api'
import type { InvitePolicy, Organization } from '../api'
import Modal from './ui/Modal'
import Button from './ui/Button'
import TextField from './ui/TextField'
import TextArea from './ui/TextArea'

interface ProjectSettingsProps {
  // Projet a modifier.
  organization: Organization
  // Jeton d'acces pour les appels proteges.
  accessToken: string
  // Fermeture du panneau.
  onClose: () => void
  // Remonte le projet mis a jour au parent.
  onUpdated: (organization: Organization) => void
}

export default function ProjectSettings({
  organization, accessToken, onClose, onUpdated,
}: ProjectSettingsProps) {
  // Champs initialises depuis le projet courant.
  const [name, setName] = useState(organization.name)
  const [description, setDescription] = useState(organization.description ?? '')
  const [invitePolicy, setInvitePolicy] = useState<InvitePolicy>(organization.invitePolicy)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await updateOrganization(accessToken, organization.id, {
        name,
        // Chaine vide envoyee comme "non fourni" : le DTO backend est @IsOptional,
        // et une chaine vide echouerait sa validation.
        description: description || undefined,
        invitePolicy,
      })
      // [IMPORTANT] PATCH /organizations/:id ne renvoie qu'un accuse de reception
      // ({ message }), pas le projet. On le RELIT donc pour afficher ce qui a
      // reellement ete enregistre, et non une reconstruction locale qui
      // divergerait si le backend normalise un champ.
      onUpdated(await getOrganization(accessToken, organization.id))
      onClose()
    } catch (err) {
      // Affiche notamment le refus du backend si l'utilisateur n'est plus admin
      // (son role a pu changer depuis l'ouverture du panneau).
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Modifier le projet" onClose={onClose}>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <TextField
          label="Nom du projet"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <TextArea
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
    </Modal>
  )
}
