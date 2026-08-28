// =============================================================================
// LoginPage.tsx : connexion / inscription.
// Coquille visuelle uniquement : toute la logique appartient au module de Qu.
// =============================================================================

import Card from '../components/ui/Card'
import SeamBlock from '../components/ui/SeamBlock'
import TextField from '../components/ui/TextField'
import Button from '../components/ui/Button'

export default function LoginPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight mb-6">Se connecter</h1>

      <Card className="max-w-[420px]">
        {/* [SEAM: AUTH — Qu] Formulaire reel : validation, appel a l'API d'auth,
            gestion des erreurs, stockage du jeton. */}
        <SeamBlock owner="Module auth · Qu">
          Connexion, inscription et authentification Google. Le gabarit visuel
          ci-dessous est prêt à être branché.
        </SeamBlock>

        <div className="grid gap-3 mt-4">
          <TextField label="Adresse e-mail" type="email" placeholder="nom@42.fr" disabled />
          <TextField label="Mot de passe" type="password" placeholder="••••••••" disabled />
          <Button variant="primary" disabled>Se connecter</Button>
        </div>
      </Card>
    </>
  )
}
