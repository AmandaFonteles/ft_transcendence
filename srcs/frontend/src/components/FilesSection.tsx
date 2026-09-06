// =============================================================================
// FilesSection.tsx : documents d'un projet — televersement, liste, telechargement.
// Les regles de validation dupliquent celles du backend (files.service.ts) :
// les verifier ici evite un aller-retour reseau pour une erreur previsible,
// mais le serveur reste la seule autorite (il verifie aussi le type REEL du
// contenu, ce que le navigateur ne sait pas faire).
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import {
  deleteProjectFile, downloadProjectFile, listProjectFiles, uploadProjectFile,
} from '../api'
import type { ProjectFile } from '../api'
import Card from './ui/Card'
import Button from './ui/Button'
import Badge from './ui/Badge'
import EmptyState from './ui/EmptyState'
import { formatDay } from '../lib/dates'

// Table des types acceptes, hors du composant : elle est constante, la recreer
// a chaque rendu ne servirait a rien.
const ALLOWED_FILE_TYPES: Record<string, string[]> = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
}

const MAX_FILE_BYTES = 10 * 1024 * 1024

// Liste d'extensions pour l'attribut accept : filtre la boite de dialogue du
// systeme, ce qui evite la plupart des refus avant meme la validation.
const ACCEPT = Object.values(ALLOWED_FILE_TYPES).flat().join(',')

// "1,4 Mo" plutot que "1468006". Les tailles s'affichent en Ko sous 1 Mo.
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1).replace('.', ',')} Mo`
}

// Etiquette courte pour la pastille : l'extension suffit a identifier le type,
// la chaine MIME complete est illisible.
function formatKind(file: ProjectFile): string {
  const dot = file.name.lastIndexOf('.')
  if (dot >= 0) return file.name.slice(dot + 1).toUpperCase()
  return file.mimeType.split('/')[1]?.toUpperCase() ?? 'FICHIER'
}

type FilesSectionProps = {
  accessToken: string
  organizationId: string
}

export default function FilesSection({ accessToken, organizationId }: FilesSectionProps) {
  const [files, setFiles] = useState<ProjectFile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // Fichier choisi mais pas encore envoye : on montre ce qui part AVANT de
  // confirmer, comme pour l'avatar.
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  // null = aucun envoi en cours ; sinon la progression en pourcent.
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  // Identifiant du fichier en cours de telechargement / de suppression, pour
  // n'immobiliser que la ligne concernee.
  const [busyId, setBusyId] = useState<string | null>(null)
  // Fichier dont la suppression attend une confirmation.
  const [confirmingId, setConfirmingId] = useState<string | null>(null)
  // L'input natif est masque : le declencheur visible est un Button du systeme
  // de design, pour ne pas laisser un widget navigateur brut dans la page.
  const fileInputRef = useRef<HTMLInputElement>(null)

  const uploading = uploadProgress !== null

  function resetSelection() {
    setSelectedFile(null)
    setUploadProgress(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  useEffect(() => {
    // Changement de projet : tout l'etat local devient caduc.
    setFiles([])
    setError(null)
    setLoading(true)
    resetSelection()
    setConfirmingId(null)

    // Le projet peut changer pendant la requete : sans ce drapeau, une reponse
    // tardive ecraserait la liste du projet suivant.
    let cancelled = false
    listProjectFiles(accessToken, organizationId)
      .then((projectFiles) => {
        if (!cancelled) setFiles(projectFiles)
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erreur lors du chargement des fichiers')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [accessToken, organizationId])

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const chosen = e.target.files?.[0] ?? null
    setUploadProgress(null)
    if (!chosen) {
      resetSelection()
      setError(null)
      return
    }
    if (chosen.size > MAX_FILE_BYTES) {
      setError('Fichier trop lourd : 10 Mo maximum.')
      resetSelection()
      return
    }
    const dot = chosen.name.lastIndexOf('.')
    const extension = dot >= 0 ? chosen.name.slice(dot).toLowerCase() : ''
    if (!ALLOWED_FILE_TYPES[chosen.type]?.includes(extension)) {
      setError('Format non accepté : images, PDF, texte et documents bureautiques uniquement.')
      resetSelection()
      return
    }
    setError(null)
    setSelectedFile(chosen)
  }

  async function handleUpload() {
    if (!selectedFile) return
    setError(null)
    setUploadProgress(0)
    try {
      const uploaded = await uploadProjectFile(accessToken, organizationId, selectedFile, setUploadProgress)
      // Le plus recent en tete : c'est celui qu'on vient d'envoyer.
      setFiles((current) => [uploaded, ...current])
      resetSelection()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur pendant l’envoi du fichier')
      resetSelection()
    }
  }

  async function handleDownload(file: ProjectFile) {
    setError(null)
    setBusyId(file.id)
    try {
      const blob = await downloadProjectFile(accessToken, organizationId, file.id)
      // La route exige un en-tete Authorization : on ne peut pas y pointer un
      // lien directement. On passe donc par une URL objet, revoquee aussitot
      // pour ne pas garder le fichier en memoire.
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = file.name
      // Firefox ignore le clic sur un lien hors du document, et revoquer l'URL
      // dans la foulee annule le telechargement : on retire donc le lien et on
      // libere l'URL au tour de boucle suivant.
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      setTimeout(() => URL.revokeObjectURL(url), 0)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur pendant le téléchargement')
    } finally {
      setBusyId(null)
    }
  }

  async function handleDelete(file: ProjectFile) {
    setError(null)
    setBusyId(file.id)
    try {
      await deleteProjectFile(accessToken, organizationId, file.id)
      setFiles((current) => current.filter((f) => f.id !== file.id))
      setConfirmingId(null)
    } catch (err) {
      // Le backend refuse la suppression a qui n'est ni proprietaire ni ADMIN :
      // son message est plus precis que tout ce qu'on pourrait deviner ici.
      setError(err instanceof Error ? err.message : 'Erreur pendant la suppression')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <>
      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      <Card className="mb-3">
        <div className="flex flex-wrap items-center gap-2">
          {selectedFile ? (
            <>
              <Button variant="primary" onClick={handleUpload} disabled={uploading}>
                {uploading ? 'Envoi…' : 'Envoyer le fichier'}
              </Button>
              <Button variant="ghost" onClick={resetSelection} disabled={uploading}>
                Annuler
              </Button>
              <span className="font-data text-[12.5px] text-ink-soft truncate min-w-0">
                {selectedFile.name} · {formatSize(selectedFile.size)}
              </span>
            </>
          ) : (
            <>
              <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
                Choisir un fichier
              </Button>
              <span className="text-[12.5px] text-ink-soft">
                Images, PDF, texte et documents bureautiques. 10 Mo maximum.
              </span>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPT}
          onChange={handleFileChange}
          disabled={uploading}
          className="sr-only"
          aria-label="Choisir un fichier à envoyer"
        />

        {/* Barre de progression : un pourcentage seul ne dit pas si l'envoi
            avance encore. aria-* la rend lisible par un lecteur d'ecran. */}
        {uploading && (
          <div className="mt-3">
            <div
              className="h-1.5 rounded-full bg-sunk overflow-hidden"
              role="progressbar"
              aria-valuenow={uploadProgress}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Envoi du fichier"
            >
              <div
                className="h-full bg-ink transition-[width] duration-150"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
            <p className="font-data text-[12.5px] text-ink-soft mt-1 tabular-nums">
              {uploadProgress}%
            </p>
          </div>
        )}
      </Card>

      {loading ? (
        <p className="text-ink-soft">Chargement…</p>
      ) : files.length === 0 ? (
        <EmptyState
          title="Aucun fichier"
          description="Les documents partagés avec l’équipe apparaîtront ici."
          illustration="none"
        />
      ) : (
        <div className="grid gap-2">
          {files.map((file) => (
            <Card key={file.id}>
              <div className="flex items-center gap-3">
                <Badge className="shrink-0 font-data">{formatKind(file)}</Badge>

                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{file.name}</div>
                  {file.description && (
                    <div className="text-[13.5px] text-ink-soft truncate">{file.description}</div>
                  )}
                  <div className="font-data text-[12.5px] text-ink-soft">
                    {formatSize(file.size)} · {formatDay(file.createdAt)}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {confirmingId === file.id ? (
                    // Second clic obligatoire : la suppression est definitive et
                    // le fichier disparait aussi du stockage.
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => handleDelete(file)}
                        disabled={busyId === file.id}
                        className="text-danger"
                      >
                        {busyId === file.id ? 'Suppression…' : 'Confirmer'}
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmingId(null)}>
                        Annuler
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="secondary"
                        onClick={() => handleDownload(file)}
                        disabled={busyId === file.id}
                      >
                        {busyId === file.id ? 'Téléchargement…' : 'Télécharger'}
                      </Button>
                      <Button variant="ghost" onClick={() => setConfirmingId(file.id)}>
                        Supprimer
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  )
}
