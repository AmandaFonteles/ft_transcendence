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
import SeamBlock from '../components/ui/SeamBlock'

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
        name,
        // Chaine vide envoyee comme "non fourni" : le DTO backend est @IsOptional.
        description: description || undefined,
        invitePolicy,
      })
      // Redirige vers le projet cree : l'utilisateur enchaine directement.
      navigate(`/projets/${org.id}`)
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
            required
          />
          <TextField
            label="Description (optionnelle)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
            <Button type="submit" variant="primary" disabled={saving}>
              {saving ? 'Création…' : 'Créer le projet'}
            </Button>
          </div>
        </form>

        <div className="mt-4">
          {/* La structure prevoit de choisir les membres des la creation, mais le
              backend n'expose pas encore de liste d'amis. */}
          <SeamBlock owner="Module amis · à attribuer">
            Choix des membres depuis une liste d'amis dès la création. En attendant,
            les membres s'ajoutent depuis la page du projet une fois celui-ci créé.
          </SeamBlock>
        </div>
      </Card>
    </>
  )
}
