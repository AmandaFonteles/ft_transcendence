// =============================================================================
// ProfilePage.tsx : profil personnel — informations, avatar, mot de passe, 2FA.
// La LOGIQUE vient du banc de test de Qu ; elle est ici decoupee en sections
// lisibles et habillee avec le systeme de design.
// =============================================================================

import { useEffect, useState } from 'react'
import {
  changePassword, confirmTwoFactor, disableTwoFactor, deleteAccount,///
  fetchAvatarPresets, selectAvatar, setupTwoFactor, updateProfile, uploadAvatar
} from '../api'
import type { AuthUser } from '../api'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import PageHeading from '../components/ui/PageHeading'
import { closeSocket } from '../realtime/socket'

export default function ProfilePage() {
  const { user, accessToken, setUser, logout } = useAuth()

  // Route protegee : ce cas ne devrait pas se produire, mais TypeScript exige
  // qu'on le traite pour que user soit non-nul dans la suite.
  if (!user || !accessToken) return <p className="text-ink-soft">Chargement…</p>

  return (
    <>
      <PageHeading title="Profil" subtitle={user.username} />

      <div className="grid gap-4 max-w-[560px]">
        <IdentityCard user={user} />
        <AvatarCard accessToken={accessToken} user={user} onUpdated={setUser} />
        <ProfileForm accessToken={accessToken} user={user} onUpdated={setUser} />
        <PasswordForm accessToken={accessToken} />
        <TwoFactorCard accessToken={accessToken} />
        <DeleteAcc accessToken={accessToken} logout={logout} />
      </div>
    </>
  )
}

// --- Identite ----------------------------------------------------------------
function IdentityCard({ user }: { user: AuthUser }) {
  return (
    <Card>
      <div className="flex items-center gap-4">
        {user.avatarUrl ? (
          <img src={user.avatarUrl} alt="" className="size-16 rounded-full object-cover" />
        ) : (
          // Repli quand aucun avatar n'est choisi : initiale du nom affiche.
          <span className="grid place-items-center size-16 rounded-full bg-sunk text-ink-soft text-xl font-semibold">
            {user.displayName.charAt(0).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          <div className="font-medium truncate">{user.displayName}</div>
          {/* Le username est genere par le backend (displayName + # + suffixe). */}
          <div className="font-data text-[12.5px] text-ink-soft truncate">{user.username}</div>
          <div className="font-data text-[12.5px] text-ink-soft truncate">{user.email}</div>
        </div>
      </div>
    </Card>
  )
}

// --- Informations ------------------------------------------------------------
function ProfileForm({
  accessToken, user, onUpdated,
}: { accessToken: string; user: AuthUser; onUpdated: (u: AuthUser) => void }) {
  const [email, setEmail] = useState(user.email)
  const [displayName, setDisplayName] = useState(user.displayName)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(false); setSaving(true)
    try {
      onUpdated(await updateProfile(accessToken, { email, displayName }))
      setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <h2 className="text-base font-semibold">Informations</h2>
        <TextField label="Adresse e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <TextField label="Nom affiché" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        {error && <p className="text-danger text-sm">{error}</p>}
        {success && <p className="text-success text-sm">Profil mis à jour.</p>}
        <div>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? '…' : 'Enregistrer'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

// --- Mot de passe ------------------------------------------------------------
function PasswordForm({ accessToken }: { accessToken: string }) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null); setSuccess(false); setSaving(true)
    try {
      await changePassword(accessToken, { currentPassword, newPassword })
      setSuccess(true)
      // Vide les champs apres succes : evite de laisser le mot de passe affiche
      // et reenvoyable par une soumission accidentelle.
      setCurrentPassword(''); setNewPassword('')
    } catch (err) {
      // Affiche notamment "compte OAuth, aucun mot de passe a modifier" (403)
      // ou "mot de passe actuel incorrect" (401), renvoyes par le backend.
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <form onSubmit={handleSubmit} className="grid gap-3">
        <h2 className="text-base font-semibold">Mot de passe</h2>
        <TextField label="Mot de passe actuel" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
        <TextField label="Nouveau mot de passe" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} required />
        {error && <p className="text-danger text-sm">{error}</p>}
        {success && <p className="text-success text-sm">Mot de passe changé.</p>}
        <div>
          <Button type="submit" variant="primary" disabled={saving}>
            {saving ? '…' : 'Changer'}
          </Button>
        </div>
      </form>
    </Card>
  )
}

// --- Double authentification -------------------------------------------------
function TwoFactorCard({ accessToken }: { accessToken: string }) {
  // Trois etats : inactif / QR affiche en attente de confirmation / actif.
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function start() {
    setError(null)
    try {
      const { qrCodeDataUrl } = await setupTwoFactor(accessToken)
      setQrCodeDataUrl(qrCodeDataUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await confirmTwoFactor(accessToken, code)
      setEnabled(true); setQrCodeDataUrl(null); setCode('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  async function disable() {
    setError(null)
    try {
      await disableTwoFactor(accessToken)
      setEnabled(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  return (
    <Card>
      <h2 className="text-base font-semibold mb-2">Authentification à deux facteurs</h2>
      {error && <p className="text-danger text-sm mb-2">{error}</p>}

      {/* LIMITE CONNUE : le backend n'expose pas l'etat 2FA dans AuthUser, donc
          l'affichage repart a "inactif" apres un rechargement de page, meme si la
          2FA est reellement active. A corriger quand /users/me renverra ce champ. */}
      {enabled ? (
        <>
          <p className="text-success text-sm mb-2">Activée.</p>
          <Button onClick={disable}>Désactiver</Button>
        </>
      ) : qrCodeDataUrl ? (
        <>
          <p className="text-[13.5px] text-ink-soft mb-2">
            Scannez ce QR code avec votre application d'authentification, puis saisissez le code affiché.
          </p>
          <img src={qrCodeDataUrl} alt="QR code de configuration" className="size-40 mb-3" />
          <form onSubmit={confirm} className="grid gap-3 max-w-[220px]">
            <TextField label="Code à 6 chiffres" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required />
            <Button type="submit" variant="primary">Confirmer</Button>
          </form>
        </>
      ) : (
        <Button onClick={start}>Activer</Button>
      )}
    </Card>
  )
}


function DeleteAcc({ accessToken, logout }: { accessToken: string; logout: () => Promise<void> }) { // sup compte
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!window.confirm('Supprimer définitivement votre compte ?')) return

    setError(null)
    setDeleting(true)
    try {
      await deleteAccount(accessToken)
      closeSocket()
      await logout()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
      setDeleting(false)
    }
  }

  return (
    <Card>
      <h2 className="text-base font-semibold mb-2 text-danger">Supprime définitivement votre compte</h2>
      {error && <p className="text-danger text-sm mb-2">{error}</p>}
      <Button variant="secondary" onClick={handleDelete} disabled={deleting}>
        {deleting ? 'Suppression…' : 'Supprimer mon compte'}
      </Button>
    </Card>
  )
}

// --- Avatar ------------------------------------------------------------------
function AvatarCard({
  accessToken, user, onUpdated,
}: { accessToken: string; user: AuthUser; onUpdated: (u: AuthUser) => void }) {
  const [presets, setPresets] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    fetchAvatarPresets()
      .then(setPresets)
      .catch(() => setError('impossible de charger les avatars'))
  }, [])

  async function pick(url: string) {
    setError(null)
    try {
      onUpdated(await selectAvatar(accessToken, url))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      onUpdated(await uploadAvatar(accessToken, file))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <Card>
      <h2 className="text-base font-semibold mb-2">Avatar</h2>
      {error && <p className="text-danger text-sm mb-2">{error}</p>}

      <div className="flex flex-wrap gap-2 mb-3">
        {presets.map((url) => (
          <button
            key={url}
            onClick={() => pick(url)}
            className={`rounded-full cursor-pointer p-0 border-0 bg-transparent ${
              url === user.avatarUrl ? 'ring-2 ring-link' : 'ring-2 ring-transparent'
            }`}
            aria-label="Choisir cet avatar"
          >
            <img src={url} alt="" className="size-12 rounded-full object-cover" />
          </button>
        ))}
      </div>

      <label className="inline-block">
        <span className="sr-only">Téléverser un avatar</span>
        <input
          type="file"
          accept="image/png"
          onChange={handleFileChange}
          disabled={uploading}
          className="text-[13.5px] text-ink-soft cursor-pointer"
        />
      </label>
      {uploading && <p className="text-ink-soft text-sm mt-1">Envoi en cours…</p>}
    </Card>
  )
}