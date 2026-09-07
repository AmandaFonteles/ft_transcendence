// =============================================================================
// ProfilePage.tsx : profil personnel — informations, avatar, mot de passe, 2FA.
// La LOGIQUE vient du banc de test de Qu ; elle est ici decoupee en sections
// lisibles et habillee avec le systeme de design.
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import {
  changePassword, confirmTwoFactor, disableTwoFactor, deleteAccount,///
  fetchAvatarPresets, me, selectAvatar, setupTwoFactor, updateProfile, uploadAvatar
} from '../api'
import type { AuthUser } from '../api'
import { useAuth } from '../auth/AuthContext'
import Card from '../components/ui/Card'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'
import PageHeading from '../components/ui/PageHeading'
import { LIMITS, isBlank } from '../lib/validation'
import { closeSocket } from '../realtime/socket'

export default function ProfilePage() {
  const { user, accessToken, setUser, logout } = useAuth()

  // Route protegee : ce cas ne devrait pas se produire, mais TypeScript exige
  // qu'on le traite pour que user soit non-nul dans la suite.
  if (!user || !accessToken) return <p className="text-ink-soft">Chargement…</p>

  return (
    <>
      <PageHeading title="Mon Profil" />

      <div className="grid gap-4 max-w-[560px]">
        <IdentityCard user={user} />
        <AvatarCard accessToken={accessToken} user={user} onUpdated={setUser} />
        <ProfileForm accessToken={accessToken} user={user} onUpdated={setUser} />
        <PasswordForm accessToken={accessToken} />
        <TwoFactorCard accessToken={accessToken} user={user} onUpdated={setUser} />
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
        <TextField label="Adresse e-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={LIMITS.EMAIL_MAX} required />
        <TextField label="Nom affiché" value={displayName} onChange={(e) => setDisplayName(e.target.value)} minLength={LIMITS.DISPLAY_NAME_MIN} maxLength={LIMITS.DISPLAY_NAME_MAX} required />
        {error && <p className="text-danger text-sm">{error}</p>}
        {success && <p className="text-success text-sm">Profil mis à jour.</p>}
        <div>
          {/* Un nom fait uniquement d'espaces passe "required" mais sera refuse
              par le backend : on bloque l'envoi ici plutot que d'aller chercher
              l'erreur au serveur. */}
          <Button type="submit" variant="primary" disabled={saving || isBlank(displayName) || isBlank(email)}>
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
        <TextField label="Mot de passe actuel" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} maxLength={LIMITS.PASSWORD_MAX} required />
        <TextField label="Nouveau mot de passe" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={LIMITS.PASSWORD_MIN} maxLength={LIMITS.PASSWORD_MAX} required />
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
// [SOURCE DE VERITE] L'etat "activee ou non" n'est PAS un state local : il vient
// de user.twoFactorEnabled, renvoye par le backend. Un state local repartait a
// "inactif" a chaque rechargement de page, meme quand la 2FA etait bien active,
// et proposait donc "Activer" a quelqu'un qui l'avait deja fait.
// Apres chaque changement, on RECHARGE l'utilisateur depuis /users/me plutot que
// de deviner le nouvel etat : le serveur reste seul juge.
function TwoFactorCard({
  accessToken,
  user,
  onUpdated,
}: { accessToken: string; user: AuthUser; onUpdated: (u: AuthUser) => void }) {
  // Seul l'ecran intermediaire (QR affiche, en attente du premier code) est un
  // etat local : il n'existe que le temps de l'activation, il n'a rien a faire
  // en base.
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const enabled = user.twoFactorEnabled

  async function start() {
    setError(null)
    setBusy(true)
    try {
      const { qrCodeDataUrl } = await setupTwoFactor(accessToken)
      setQrCodeDataUrl(qrCodeDataUrl)
    } catch (err) {
      // Cas frequent : compte OAuth pur, le backend repond 403 avec un message
      // explicite ("ce compte est connecte via OAuth"). On l'affiche tel quel.
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function confirm(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await confirmTwoFactor(accessToken, code)
      setQrCodeDataUrl(null)
      setCode('')
      // Le backend vient de basculer twoFactorEnabled : on relit l'utilisateur
      // pour que TOUTE l'application (pas seulement cette carte) soit a jour.
      onUpdated(await me(accessToken))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setError(null)
    setBusy(true)
    try {
      await disableTwoFactor(accessToken)
      onUpdated(await me(accessToken))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setBusy(false)
    }
  }

  // Annule une activation commencee mais jamais confirmee : on jette simplement
  // le QR code. Le secret reste stocke en base mais twoFactorEnabled reste false,
  // donc le compte n'est pas verrouille ; un nouveau "Activer" regenere un secret.
  function cancel() {
    setQrCodeDataUrl(null)
    setCode('')
    setError(null)
  }

  return (
    <Card>
      <h2 className="text-base font-semibold mb-2">Authentification à deux facteurs</h2>
      {error && <p className="text-danger text-sm mb-2">{error}</p>}

      {enabled ? (
        <>
          <p className="text-success text-sm mb-2">
            Activée. Un code de votre application d'authentification vous sera demandé à chaque connexion.
          </p>
          <Button onClick={disable} disabled={busy}>
            {busy ? 'Désactivation…' : 'Désactiver'}
          </Button>
        </>
      ) : qrCodeDataUrl ? (
        <>
          <p className="text-[13.5px] text-ink-soft mb-2">
            Scannez ce QR code avec votre application d'authentification, puis saisissez le code affiché.
          </p>
          <img src={qrCodeDataUrl} alt="QR code de configuration" className="size-40 mb-3" />
          <form onSubmit={confirm} className="grid gap-3 max-w-[220px]">
            <TextField label="Code à 6 chiffres" value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} required />
            <div className="flex gap-2">
              <Button type="submit" variant="primary" disabled={busy}>
                {busy ? 'Vérification…' : 'Confirmer'}
              </Button>
              <Button type="button" variant="ghost" onClick={cancel} disabled={busy}>Annuler</Button>
            </div>
          </form>
        </>
      ) : (
        <>
          <p className="text-[13.5px] text-ink-soft mb-2">
            Désactivée. Une fois activée, votre mot de passe seul ne suffira plus à vous connecter.
          </p>
          <Button onClick={start} disabled={busy}>
            {busy ? 'Préparation…' : 'Activer'}
          </Button>
        </>
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
// Contraintes miroir du backend (users.service.ts) : PNG uniquement, 5 Mo max.
// Les verifier ici evite un aller-retour reseau pour une erreur previsible.
const AVATAR_MAX_BYTES = 5 * 1000000
const AVATAR_MIME = 'image/png'

function AvatarCard({
  accessToken, user, onUpdated,
}: { accessToken: string; user: AuthUser; onUpdated: (u: AuthUser) => void }) {
  const [presets, setPresets] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  // Fichier choisi mais pas encore envoye : l'utilisateur voit ce qu'il envoie
  // AVANT de confirmer, comme pour les fichiers de projet.
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  // L'input natif est masque : le declencheur visible est un Button du systeme
  // de design, pour ne pas laisser un widget navigateur brut dans la page.
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchAvatarPresets()
      .then(setPresets)
      .catch(() => setError('impossible de charger les avatars'))
  }, [])

  // L'URL objet doit etre liberee, sinon le blob reste en memoire tant que
  // l'onglet est ouvert.
  useEffect(() => {
    if (!file) {
      setPreview(null)
      return
    }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function reset() {
    setFile(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function pick(url: string) {
    setError(null)
    reset()
    try {
      onUpdated(await selectAvatar(accessToken, url))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] ?? null
    if (!chosen) {
      reset()
      setError(null)
      return
    }
    if (chosen.type !== AVATAR_MIME || !chosen.name.toLowerCase().endsWith('.png')) {
      setError('Format non accepté : l’avatar doit être une image PNG.')
      reset()
      return
    }
    if (chosen.size > AVATAR_MAX_BYTES) {
      setError('Image trop lourde : 5 Mo maximum.')
      reset()
      return
    }
    setError(null)
    setFile(chosen)
  }

  async function handleUpload() {
    if (!file) return
    setError(null)
    setUploading(true)
    try {
      onUpdated(await uploadAvatar(accessToken, file))
      reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'erreur inconnue')
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card>
      <h2 className="text-base font-semibold mb-3">Avatar</h2>

      <div className="flex items-center gap-4 mb-3">
        {/* Apercu : le fichier choisi prend la place de l'avatar courant, pour
            que le resultat soit visible avant l'envoi. */}
        {(preview ?? user.avatarUrl) ? (
          <img
            src={preview ?? user.avatarUrl ?? ''}
            alt=""
            className="size-16 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="grid place-items-center size-16 rounded-full bg-sunk text-ink-soft text-xl font-semibold shrink-0">
            {user.displayName.charAt(0).toUpperCase()}
          </span>
        )}

        <div className="min-w-0">
          {file ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" onClick={handleUpload} disabled={uploading}>
                  {uploading ? 'Envoi…' : 'Enregistrer'}
                </Button>
                <Button variant="ghost" onClick={reset} disabled={uploading}>
                  Annuler
                </Button>
              </div>
              <p className="font-data text-[12.5px] text-ink-soft truncate mt-1">
                {file.name} · {Math.round(file.size / 1024)} Ko
              </p>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Upload son avatar
              </Button>
              <p className="text-[12.5px] text-ink-soft mt-1">PNG, 5 Mo maximum.</p>
            </>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png"
        onChange={handleFileChange}
        disabled={uploading}
        className="sr-only"
        aria-label="Téléverser un avatar"
      />

      {error && <p className="text-danger text-sm mb-2">{error}</p>}

      {/* Rien a proposer si la liste n'a pas pu etre chargee : on n'affiche pas
          un intitule suivi du vide. */}
      {presets.length > 0 && (
        <p className="text-[12.5px] text-ink-soft mb-2">Ou choisir un avatar proposé :</p>
      )}
      <div className="flex flex-wrap gap-2">
        {presets.map((url) => (
          <button
            key={url}
            onClick={() => pick(url)}
            className={`rounded-full cursor-pointer p-0 border-0 bg-transparent ${
              url === user.avatarUrl ? 'ring-2 ring-link' : 'ring-2 ring-transparent hover:ring-ink-faint'
            }`}
            aria-label="Choisir cet avatar"
            aria-pressed={url === user.avatarUrl}
          >
            <img src={url} alt="" className="size-12 rounded-full object-cover" />
          </button>
        ))}
      </div>
    </Card>
  )
}
