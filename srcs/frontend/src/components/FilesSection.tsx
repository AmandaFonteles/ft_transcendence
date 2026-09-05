import { useState } from 'react'

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

export default function FilesSection() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  return (
    <section>
      <input
        type="file"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null
          if (!file) {
            setSelectedFile(null)
            setError(null)
            return
          }
		  if (file.size > 10 * 1024 * 1024) {
  			setError('Le fichier dépasse la taille maximale de 10 Mo')
			setSelectedFile(null)
			return
		  }
		  const dotIndex = file.name.lastIndexOf('.')
          const fileExtension = dotIndex >= 0 ? file.name.slice(dotIndex).toLowerCase() : ''
		  if (!ALLOWED_FILE_TYPES[file.type]?.includes(fileExtension)) {
			setError('Extension de fichier non autorisée')
			setSelectedFile(null)
			return
		  }
	      setError(null)
          setSelectedFile(file)
        }}
      />

      {selectedFile && (
        <p>Fichier sélectionné : {selectedFile.name}</p>
      )}
      {error && (
        <p style={{ color: 'red' }}>{error}</p>
      )}
    </section>
  )
}