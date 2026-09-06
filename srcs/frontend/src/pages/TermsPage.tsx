// =============================================================================
// TermsPage.tsx : conditions d'utilisation.
//
// La grille d'evaluation exige des pages Privacy Policy ET Terms of Service, avec
// un contenu pertinent. Une page vide ou generique entraine le rejet du projet.
//
// Ton assume : des conditions lisibles, qui disent franchement ce qu'on attend
// des utilisateurs et ce qu'un projet d'ecole peut reellement garantir.
// =============================================================================

import { Link } from 'react-router-dom'
import LegalSection from '../components/LegalSection'

export default function TermsPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight mb-2">
        Conditions d'utilisation
      </h1>
      <p className="font-data text-[13px] text-ink-soft mb-6">
        Dernière mise à jour : septembre 2026
      </p>

      <LegalSection title="L'essentiel">
        <p>
          Utilisez Aqan pour organiser vos projets, respectez les autres membres, et
          gardez en tête que c'est un projet d'école : rien n'est garanti, ni la
          disponibilité, ni la survie de vos données. Le reste de cette page détaille
          ces trois idées.
        </p>
      </LegalSection>

      <LegalSection title="Ce que fait Aqan">
        <p>
          <strong>Aqan</strong> vous permet de créer des projets, d'y inviter des
          membres, d'y gérer des tâches avec des dates et des statuts, et de suivre le
          tout dans un agenda partagé. L'application est développée par des étudiants
          de l'école 42 dans le cadre du projet <em>ft_transcendence</em>, à des fins
          strictement pédagogiques : nous apprenons en la construisant, et vous
          l'utilisez dans ce cadre-là.
        </p>
      </LegalSection>

      <LegalSection title="Votre compte">
        <p>
          Pour entrer, il faut un compte : une adresse e-mail et un mot de passe, ou
          une connexion via 42 ou GitHub. Nous vous demandons deux choses simples —
          une adresse e-mail qui fonctionne réellement, et de ne pas vous faire passer
          pour quelqu'un d'autre.
        </p>
        <p>
          Votre mot de passe est votre responsabilité, comme tout ce qui se passe
          depuis votre compte. Si vous voulez dormir tranquille, activez la double
          authentification depuis votre <Link to="/profil">profil</Link> : c'est deux
          minutes, et cela change beaucoup de choses.
        </p>
      </LegalSection>

      <LegalSection title="Ce que nous vous demandons de ne pas faire">
        <p>
          Rien de surprenant, mais autant l'écrire noir sur blanc. En utilisant Aqan,
          vous vous engagez à ne pas :
        </p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            publier de contenu illégal, haineux, harcelant, ou qui porte atteinte aux
            droits de quelqu'un ;
          </li>
          <li>
            chercher à accéder à des projets, des tâches ou des comptes dont vous
            n'êtes pas membre ;
          </li>
          <li>
            perturber le service, par exemple avec des requêtes automatisées massives
            ou en exploitant une faille au lieu de{' '}
            <Link to="/contact">nous la signaler</Link> ;
          </li>
          <li>
            y stocker des données sensibles ou confidentielles, en particulier celles
            de tiers qui n'ont rien demandé.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Ce que vous écrivez vous appartient">
        <p>
          Les noms et descriptions de vos projets et de vos tâches restent les vôtres.
          Vous nous accordez seulement le droit technique de les stocker et de les
          afficher aux membres concernés — c'est-à-dire, tout simplement, de faire
          fonctionner l'application.
        </p>
        <p>
          À l'intérieur d'un projet, ses membres voient les tâches et, selon leur
          rôle, peuvent les modifier. Les administrateurs d'un projet en font plus :
          ils gèrent les membres et peuvent supprimer le projet. Réfléchissez donc à
          qui vous donnez ce rôle.
        </p>
      </LegalSection>

      <LegalSection title="Ce que nous ne pouvons pas promettre">
        <p>
          Le service est fourni « en l'état ». Nous ne garantissons ni sa
          disponibilité, ni sa continuité, ni la préservation de ce que vous y mettez.
          C'est un projet étudiant : il peut être interrompu, réinitialisé ou modifié
          du jour au lendemain, parfois parce qu'une soutenance approche.
        </p>
        <p>
          Conséquence pratique : si une information compte vraiment pour vous, gardez-en
          une copie ailleurs. Nous ne pourrons pas être tenus responsables d'une perte
          de données.
        </p>
      </LegalSection>

      <LegalSection title="Suspension et suppression">
        <p>
          Un compte qui ne respecte pas ces conditions peut être suspendu ou supprimé.
          Dans l'autre sens, vous pouvez demander la suppression du vôtre quand vous le
          souhaitez ; ce qu'il advient alors de vos données est décrit dans la{' '}
          <Link to="/confidentialite">politique de confidentialité</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Vos données personnelles">
        <p>
          Elles sont traitées comme l'explique la{' '}
          <Link to="/confidentialite">politique de confidentialité</Link>, qui fait
          partie intégrante de ces conditions. Elle se lit en cinq minutes, et vous y
          verrez exactement ce que nous conservons.
        </p>
      </LegalSection>

      <LegalSection title="Si ces conditions changent">
        <p>
          Elles suivront l'évolution de l'application, et la date en haut de page vous
          indiquera toujours de quand date la version que vous lisez. Une question, un
          désaccord, une formulation obscure ? La page{' '}
          <Link to="/contact">Contact</Link> est là pour ça.
        </p>
      </LegalSection>
    </>
  )
}
