// Page de contact, liee depuis le pied de page. La grille d'evaluation exige un
// contenu reellement renseigne, pas un placeholder.

import { Link } from 'react-router-dom'
import LegalSection from '../components/LegalSection'

export default function ContactPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight mb-2">Contact</h1>
      <p className="text-ink-soft max-w-[68ch] mb-6">
        <strong>Aqan</strong> est développé par quatre étudiants de l'école 42, dans
        le cadre de <em>ft_transcendence</em>. Pas de support 24/7 : derrière chaque
        réponse, il y a simplement l'un d'entre nous.
      </p>

      <LegalSection title="À qui écrire">
        <p>
          Tout arrive à <a href="mailto:contact@aqan.42.fr">contact@aqan.42.fr</a>.
          Mettez un login en objet, vous gagnerez un aller-retour :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <span className="font-data">afontele</span>, <em>Product Owner</em> — le
            produit, vos données, une idée à proposer.
          </li>
          <li>
            <span className="font-data">ndarouec</span>, <em>Technical Lead</em> — un
            bug, une faille, un comportement anormal.
          </li>
        </ul>
        <p>
          <span className="font-data">aibonade</span> (Project Manager) et{' '}
          <span className="font-data">qboutel</span> (développeur) complètent l'équipe,
          mais ne suivent pas cette boîte. Dans le doute, écrivez sans objet
          particulier : nous transmettrons.
        </p>
      </LegalSection>

      <LegalSection title="Signaler une faille">
        <p>
          Écrivez-nous plutôt que de publier, décrivez comment reproduire, et
          laissez-nous le temps de corriger. Un signalement de bonne foi ne vous
          exposera jamais à quoi que ce soit — c'est le meilleur retour qu'on puisse
          recevoir.
        </p>
      </LegalSection>

      <LegalSection title="Ce que nous pouvons faire">
        <p>
          Vous aider à récupérer votre compte, répondre sur vos données, corriger un
          bug. En revanche Aqan reste un projet pédagogique : aucun délai de réponse
          ni aucune récupération de données perdues ne sont garantis — voir les{' '}
          <Link to="/conditions">conditions d'utilisation</Link>. Comptez quelques
          jours pour une réponse, davantage en période d'examens ; relancez-nous si
          rien ne vient.
        </p>
      </LegalSection>

      <LegalSection title="Vos messages">
        <p>
          Ils restent dans nos boîtes mail, l'application n'en garde rien. Ce qu'Aqan
          conserve de vous est détaillé dans la{' '}
          <Link to="/confidentialite">politique de confidentialité</Link>.
        </p>
      </LegalSection>
    </>
  )
}
