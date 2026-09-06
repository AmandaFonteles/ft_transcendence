import { useEffect, useState, useRef } from 'react'
import { listProjectFiles, ProjectFile, uploadProjectFile } from '../api'

//On ne la charge qu'une seule fois
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
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx']
}

type FilesSectionProps = {
  accessToken: string
  organizationId: string
}

export default function FilesSection({ accessToken, organizationId }: FilesSectionProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number | null>(null)
  const [files, setFiles] = useState<ProjectFile[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setFiles([])
    setError(null)
	setSelectedFile(null)
    setUploadProgress(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }

    async function loadFiles() {
      try {
        const projectFiles = await listProjectFiles(accessToken, organizationId)
        setFiles(projectFiles)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des fichiers')
      }
    }
    loadFiles()
  }, [accessToken, organizationId])

  async function handleUpload() {
  	if (!selectedFile)
  	  return
  	try {
  	  setError(null)
      setUploadProgress(0)
  	  const uploadedFile = await uploadProjectFile( accessToken, organizationId, selectedFile, setUploadProgress)
      setFiles((currentFiles) => [...currentFiles, uploadedFile])
	  setSelectedFile(null)
      setUploadProgress(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
	  }
  	} catch (err) {
	  setUploadProgress(null)
	  setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
	  }
  	  setError(err instanceof Error ? err.message : `Erreur pendant l’envoi du fichier`)
  	}
  }	

  return (
    <section>
      <input
        type="file"
		accept=".jpg,.jpeg,.png,.webp,.pdf,.txt,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null
		  setUploadProgress(null)
          if (!file) {
            setSelectedFile(null)
            setError(null)
            return
          }
		  if (file.size > 10 * 1024 * 1024) {
  			setError('Le fichier dépasse la taille maximale de 10 Mo')
			setSelectedFile(null)
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
	        }
			return
		  }
		  const dotIndex = file.name.lastIndexOf('.')
          const fileExtension = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : ''
		  if (!ALLOWED_FILE_TYPES[file.type]?.includes(fileExtension)) {
			setError('Fichier non autorisé')
			setSelectedFile(null)
            if (fileInputRef.current) {
              fileInputRef.current.value = ''
	        }
			return
		  }
	      setError(null)
          setSelectedFile(file)
        }}
		ref={fileInputRef}
		disabled={uploadProgress !== null}
      />

      {selectedFile && (
        <p>Fichier sélectionné : {selectedFile.name}</p>
      )}
      {error && (
        <p className="text-danger">{error}</p>
      )}
	  {selectedFile && (
        <button type="button" onClick={handleUpload} disabled={uploadProgress !== null}>
          Envoyer le fichier
        </button>
      )}
	  {uploadProgress !== null && (
        <p>Envoi : {uploadProgress}%</p>
      )}
	  {files.length === 0 ? (
        <p>Aucun fichier</p>
      ) : (
        <ul>
          {files.map((file) => (
            <li key={file.id}>
              {file.name}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}