import { useEffect, useRef, useState } from 'react'
import { useProjectChat } from '../realtime/useProjectChat'
import { useAuth } from '../auth/AuthContext'
import Card from './ui/Card'
import Button from './ui/Button'
import TextField from './ui/TextField'
import { LIMITS } from '../lib/validation'

// Chat temps reel d'un projet : historique charge via REST, nouveaux messages via
// websocket. L'appartenance au projet est verifiee cote backend a chaque
// connexion et a chaque envoi.
export default function ChatPanel({ organizationId }: { organizationId: string }) {
  const { user, accessToken } = useAuth()
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  const { connected, messages, loadingHistory, error, sendMessage } = useProjectChat(
    organizationId,
    accessToken ?? '',
  )

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    sendMessage(draft)
    setDraft('')
  }

  // Pas de session encore etablie (rafraichissement silencieux en cours) : ni
  // l'historique REST ni le handshake socket ne peuvent aboutir.
  if (!user || !accessToken) return null

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Discussion</h3>
        <span className={`text-[12px] ${connected ? 'text-emerald-600' : 'text-ink-faint'}`}>
          {connected ? 'En direct' : 'Connexion…'}
        </span>
      </div>

      {error && <p className="text-danger text-sm mb-3">{error}</p>}

      {loadingHistory ? (
        <p className="text-ink-soft text-sm">Chargement des messages…</p>
      ) : messages.length === 0 ? (
        <p className="text-ink-soft text-sm mb-3">Aucun message pour l'instant. Lancez la discussion !</p>
      ) : (
        <div className="max-h-[360px] overflow-y-auto pr-1 mb-3 grid gap-2">
          {messages.map((m) => {
            // m.author.user.id est le vrai User.id dans les deux cas. Comparer
            // m.authorId (une cle OrganizationMember.id) marchait par coincidence
            // pour les messages recus en direct, mais pas pour l'historique REST :
            // au rechargement, nos propres messages repassaient a gauche.
            const isMine = m.author.user.id === user!.id
            return (
              <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[75%] rounded-2xl px-3 py-2 ${isMine ? 'bg-ink text-white' : 'bg-sunk text-ink'}`}>
                  {!isMine && (
                    <div className="text-[12px] font-semibold opacity-70 mb-0.5">
                      {m.author.user.displayName}
                    </div>
                  )}
                  <div className="text-[14px] whitespace-pre-wrap break-words">{m.content}</div>
                </div>
              </div>
            )
          })}
          <div ref={bottomRef} />
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex gap-2 items-end">
        <div className="flex-1">
          <TextField
            label=""
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Écrire un message…"
            // Le gateway refuse au-dela : autant empecher la saisie.
            maxLength={LIMITS.MESSAGE_CONTENT_MAX}
          />
        </div>
        <Button type="submit" variant="primary" disabled={!draft.trim() || !connected}>
          Envoyer
        </Button>
      </form>
    </Card>
  )
}
