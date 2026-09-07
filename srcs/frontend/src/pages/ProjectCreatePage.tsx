// =============================================================================
// ProjectCreatePage.tsx : creation d'un projet (Organization cote backend).
// Le createur en devient automatiquement ADMIN.
// =============================================================================

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { createOrganization } from '../api'
import type { InvitePolicy } from '../api'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import { LIMITS, isBlank } from '../lib/validation'

export default function ProjectCreatePage() {
  const { accessToken } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  // Politique d'invitation : qui peut ajouter des membres.
  const [invitePolicy, setInvitePolicy] = useState<InvitePolicy>('ADMIN_ONLY')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!accessToken) return
    setError(null)
    setSaving(true)
    try {
      const org = await createOrganization(accessToken, {
        // trim() avant l'envoi : "required" laisse passer un champ rempli
        // d'espaces, le backend le refuserait. On envoie donc ce qui sera
        // reellement enregistre, et le bouton est desactive si c'est vide.
        name: name.trim(),
        // Chaine vide envoyee comme "non fourni" : le DTO backend est @IsOptional.
        description: description.trim() || undefined,
        invitePolicy,
      })
      // Redirige vers le projet cree : l'utilisateur enchaine directement.
      navigate(`/projets/${org.organizationId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight mb-6">Créer un projet</h1>

      <Card className="max-w-[520px]">
        <form onSubmit={handleSubmit} className="grid gap-3">
          <TextField
            label="Nom du projet"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Refonte du site"
            maxLength={LIMITS.ORGANIZATION_NAME_MAX}
            required
          />
          <TextField
            label="Description (optionnelle)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={LIMITS.ORGANIZATION_DESCRIPTION_MAX}
          />

          <div className="grid gap-1">
            <label htmlFor="invite-policy" className="text-[13.5px] text-ink-soft">
              Qui peut ajouter des membres
            </label>
            <select
              id="invite-policy"
              value={invitePolicy}
              onChange={(e) => setInvitePolicy(e.target.value as InvitePolicy)}
              className="w-full bg-surface border border-rule rounded-lg px-3 py-2 text-[15px] cursor-pointer"
            >
              <option value="ADMIN_ONLY">Les administrateurs uniquement</option>
              <option value="ANY_MEMBER">Tous les membres</option>
            </select>
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}

          <div>
            {/* Desactive aussi sur un nom fait uniquement d'espaces : "required"
                ne couvre que le champ VIDE, pas le champ blanc. */}
            <Button type="submit" variant="primary" disabled={saving || isBlank(name)}>
              {saving ? 'Création…' : 'Créer le projet'}
            </Button>
          </div>
        </form>
      </Card>
    </>
  )
}
