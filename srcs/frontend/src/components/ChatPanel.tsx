// =============================================================================
// ChatPanel.tsx : chat temps reel d'un projet. Membres = membres du projet
// (verifie cote backend a chaque connexion ET a chaque envoi, jamais confiance
// au seul front). Historique charge via REST, nouveaux messages via websocket.
// =============================================================================

import { useEffect, useRef, useState } from 'react'
import { useProjectChat } from '../realtime/useProjectChat'
import { useAuth } from '../auth/AuthContext'
import Card from './ui/Card'
import Button from './ui/Button'
import TextField from './ui/TextField'
import { LIMITS } from '../lib/validation'

export default function ChatPanel({ organizationId }: { organizationId: string }) {
  const { user, accessToken } = useAuth()
  const [draft, setDraft] = useState('')
  // Reference vers le bas de la liste, pour auto-scroller a chaque nouveau message.
  const bottomRef = useRef<HTMLDivElement>(null)

  const { connected, messages, loadingHistory, error, sendMessage } = useProjectChat(
    organizationId,
    accessToken ?? '',
  )

  // Auto-scroll vers le dernier message a chaque nouvel envoi/reception.
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!draft.trim()) return
    sendMessage(draft)
    setDraft('')
  }

  // Pas encore d'identite ou de token : rien a afficher (evite un flash d'erreur
  // au tout premier rendu, le temps que AuthContext termine son chargement).
  // Pas de session encore etablie (rafraichissement silencieux en cours) :
  // ni l'historique REST ni le handshake socket ne peuvent aboutir.
  if (!user || !accessToken) return null

  return (
    <Card>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-semibold">Discussion</h3>
        {/* Petit indicateur discret de l'etat de connexion, pas bloquant. */}
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
        // Zone defilante : borne la hauteur du chat, meme pattern que la liste
        // de taches (max-h + overflow-y-auto) dans ProjectPage.
        <div className="max-h-[360px] overflow-y-auto pr-1 mb-3 grid gap-2">
          {messages.map((m) => {
            // [IMPORTANT] m.authorId est la cle etrangere Message.authorId, qui
            // pointe vers OrganizationMember.id (pas l'utilisateur). Comparer ce
            // champ a user.id (un User.id) fonctionnait par coincidence pour les
            // messages recus en direct (le gateway y met le vrai userId), mais
            // pas pour l'historique REST (Prisma y renvoie le vrai authorId) : au
            // rechargement, tous nos propres messages passaient a gauche/gris.
            // m.author.user.id, lui, est le vrai User.id dans les DEUX cas.
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
          {/* Le gateway refuse au-dela de cette longueur : mieux vaut empecher
              la saisie que laisser rediger un pave rejete a l'envoi. */}
          <TextField
            label=""
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Écrire un message…"
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