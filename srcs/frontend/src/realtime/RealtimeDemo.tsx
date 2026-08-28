// =============================================================================
// RealtimeDemo.tsx : composant de DEMONSTRATION du module temps reel.
// But : prouver le fonctionnement a la soutenance en ouvrant deux onglets.
// Il sera remplace par le vrai tableau d'Ai ; le hook, lui, restera identique.
// =============================================================================

// Importe le hook de temps reel.
import { useBoardRealtime } from './useBoardRealtime'
// Importe le singleton (pour emettre un evenement de test).
import { getSocket } from './socket'
// Importe le contrat.
import { ClientEvents } from './events'

// Tableau fictif utilise tant que le module de Ai n'existe pas.
const DEMO_BOARD_ID = 'demo-board'

// Le composant recoit l'identite a utiliser pour la connexion.
export default function RealtimeDemo({ userId, displayName }: { userId: string; displayName: string }) {
  // Branche le composant au temps reel du tableau de demo.
  const { connected, members, lastMove } = useBoardRealtime(DEMO_BOARD_ID, { userId, displayName })

  // Emet un faux deplacement de carte : les AUTRES onglets doivent l'afficher.
  const emitFakeMove = () => {
    // Recupere la socket partagee.
    getSocket({ userId, displayName }).emit(ClientEvents.CARD_MOVED, {
      boardId: DEMO_BOARD_ID,
      // Identifiants fictifs : la persistance viendra avec le module de Ai.
      cardId: 'card-demo',
      toListId: 'list-demo',
      // Position fractionnaire simulee (chaine, cf. LexoRank).
      position: String(Date.now()),
    })
  }

  // Rendu de la demo.
  return (
    <section className="demo">
      {/* Indicateur de connexion WebSocket. */}
      <p className="status">
        WebSocket: <strong>{connected ? 'connecté' : 'déconnecté'}</strong>
      </p>

      {/* Liste des membres presents (mise a jour en direct). */}
      <p className="status">
        Présents ({members.length}) :{' '}
        <strong>{members.map((m) => m.displayName).join(', ') || '—'}</strong>
      </p>

      {/* Bouton de test : diffuse un mouvement aux autres onglets. */}
      <button onClick={emitFakeMove} disabled={!connected}>
        Simuler un déplacement de carte
      </button>

      {/* Affiche le dernier mouvement RECU (donc emis par un autre onglet). */}
      {lastMove && (
        <p className="status">
          Dernier déplacement reçu : carte <strong>{lastMove.cardId}</strong> par{' '}
          <strong>{lastMove.movedBy?.displayName ?? 'inconnu'}</strong>
        </p>
      )}
    </section>
  )
}
