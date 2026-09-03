// =============================================================================
// PrivacyPage.tsx : politique de confidentialite.
//
// La grille d'evaluation exige un contenu PERTINENT, pas un placeholder : une
// page vide ou generique entraine le rejet du projet. Le texte ci-dessous decrit
// donc les donnees REELLEMENT stockees par l'application, telles que definies
// dans srcs/backend/prisma/schema.prisma. A mettre a jour quand le schema evolue.
// =============================================================================

import { Link } from 'react-router-dom'
import LegalSection from '../components/LegalSection'

export default function PrivacyPage() {
  return (
    <>
      <h1 className="text-[28px] font-semibold tracking-tight mb-2">
        Politique de confidentialité
      </h1>
      <p className="font-data text-[13px] text-ink-soft mb-6">
        Dernière mise à jour : septembre 2026
      </p>

      <LegalSection title="Qui sommes-nous">
        <p>
          <strong>Aqan</strong> est un projet étudiant réalisé à l'école 42 dans le
          cadre de <em>ft_transcendence</em>. Elle permet à des équipes d'organiser des
          projets, des tâches et un agenda partagé. Elle n'a aucune finalité
          commerciale et n'est pas destinée à un usage en production.
        </p>
      </LegalSection>

      <LegalSection title="Données que nous collectons">
        <p>Nous ne collectons que les données nécessaires au fonctionnement du service :</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <strong>Compte</strong> : votre adresse e-mail, votre nom affiché, un
            identifiant public généré automatiquement à partir de ce nom, et un
            avatar choisi parmi une liste d'images fournies par l'application.
          </li>
          <li>
            <strong>Authentification</strong> : une empreinte de votre mot de passe.
            Le mot de passe lui-même n'est jamais stocké ni consultable.
          </li>
          <li>
            <strong>Double authentification</strong> : si vous l'activez, une clé
            secrète permettant de vérifier les codes de votre application
            d'authentification.
          </li>
          <li>
            <strong>Connexion externe</strong> : si vous vous connectez via 42 ou
            GitHub, l'identifiant que ce service nous transmet, afin de rattacher la
            connexion à votre compte.
          </li>
          <li>
            <strong>Contenu que vous créez</strong> : projets, descriptions, tâches,
            dates de début et d'échéance, statuts, et les rôles et affectations qui
            vous lient aux projets et aux tâches.
          </li>
        </ul>
        <p>
          Nous ne collectons ni données de localisation, ni identifiants publicitaires,
          ni historique de navigation. Aucun outil d'analyse d'audience n'est installé.
        </p>
      </LegalSection>

      <LegalSection title="Pourquoi nous les utilisons">
        <p>
          Ces données servent uniquement à faire fonctionner l'application : vous
          authentifier, afficher vos projets et vos tâches, vous identifier auprès des
          autres membres de vos projets, et appliquer les droits liés à votre rôle.
          Elles ne sont jamais utilisées à des fins de profilage ou de publicité.
        </p>
      </LegalSection>

      <LegalSection title="Ce que voient les autres utilisateurs">
        <p>
          Les membres connectés peuvent voir votre <strong>nom affiché</strong>, votre
          identifiant public et votre avatar. <strong>Votre adresse e-mail n'est
          jamais exposée</strong> aux autres utilisateurs : l'annuaire ne la renvoie
          pas. Les membres d'un même projet voient les tâches de ce projet et les
          personnes qui y sont affectées.
        </p>
      </LegalSection>

      <LegalSection title="Cookies">
        <p>
          Un seul cookie est déposé : un jeton de session technique, nécessaire pour
          vous maintenir connecté d'une visite à l'autre. Il est <em>httpOnly</em>,
          donc inaccessible au JavaScript de la page, et transmis uniquement en
          HTTPS. Aucun cookie publicitaire ni de mesure d'audience n'est utilisé.
        </p>
      </LegalSection>

      <LegalSection title="Partage avec des tiers">
        <p>
          Aucune donnée n'est vendue, louée ni transmise à un tiers. Les seules
          communications externes sont celles que vous déclenchez vous-même en
          choisissant de vous connecter via 42 ou GitHub.
        </p>
      </LegalSection>

      <LegalSection title="Sécurité">
        <p>
          Les mots de passe sont hachés et salés avec Argon2, un algorithme conçu pour
          résister aux attaques par force brute. Toutes les communications entre votre
          navigateur et le serveur passent par HTTPS. Les entrées sont validées côté
          serveur avant tout enregistrement.
        </p>
        <p>
          Ce projet reste un travail étudiant : nous ne pouvons pas garantir le niveau
          de sécurité d'un service professionnel. N'y saisissez aucune information
          sensible ou confidentielle.
        </p>
      </LegalSection>

      <LegalSection title="Conservation et suppression">
        <p>
          Vos données sont conservées tant que votre compte existe. À sa suppression,
          les informations qui vous sont rattachées — identifiants de connexion,
          comptes externes liés, appartenances aux projets et affectations de tâches —
          sont supprimées automatiquement avec lui. Les projets et tâches créés
          peuvent subsister s'ils appartiennent encore à une équipe active.
        </p>
        <p>
          S'agissant d'un projet pédagogique, la base de données peut être réinitialisée
          à tout moment durant le développement.
        </p>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Vous pouvez consulter et modifier votre nom affiché, votre adresse e-mail et
          votre avatar depuis votre <Link to="/profil">page de profil</Link>, et changer
          votre mot de passe à tout moment. Pour toute demande relative à vos données,
          utilisez la page <Link to="/contact">Contact</Link>.
        </p>
      </LegalSection>

      <LegalSection title="Modifications">
        <p>
          Cette politique peut évoluer avec l'application. La date de dernière mise à
          jour figure en haut de cette page.
        </p>
      </LegalSection>
    </>
  )
}
