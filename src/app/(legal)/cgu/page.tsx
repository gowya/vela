import type { Metadata } from "next";
import { Section, P, Ul, LegalLink } from "../_components";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation — Vela",
};

export default function CguPage() {
  return (
    <article className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl text-foreground">
          Conditions générales d&apos;utilisation
        </h1>
        <p className="text-sm text-muted-foreground">Dernière mise à jour : 10 juillet 2026</p>
      </header>

      <Section title="1. Objet">
        <P>
          Ces conditions régissent l&apos;accès et l&apos;utilisation de Vela, un logiciel de
          suivi patient destiné aux praticiens de l&apos;accompagnement humain. En créant un
          compte, vous les acceptez.
        </P>
      </Section>

      <Section title="2. Définitions">
        <Ul
          items={[
            <>
              <strong>Vela</strong> : le service édité par Margaux FRANCILLARD (Entrepreneur
              Individuel).
            </>,
            <>
              <strong>Praticien</strong> ou <strong>vous</strong> : le professionnel qui utilise
              le service.
            </>,
            <>
              <strong>Patient</strong> : la personne suivie par le praticien, dont les données
              sont saisies dans le service.
            </>,
            <>
              <strong>Compte</strong> : l&apos;espace personnel du praticien.
            </>,
          ]}
        />
      </Section>

      <Section title="3. Accès au service">
        <P>
          Vela est réservé aux professionnels de l&apos;accompagnement humain agissant dans un
          cadre professionnel. Le service n&apos;est pas destiné aux particuliers ni aux
          patients.
        </P>
        <P>
          Vous devez fournir des informations exactes à l&apos;inscription et les tenir à jour.
          Vous êtes responsable de la confidentialité de vos identifiants et de toute action
          réalisée depuis votre compte. Prévenez-nous sans délai en cas d&apos;accès non
          autorisé.
        </P>
      </Section>

      <Section title="4. Vos obligations concernant les données patients">
        <P>
          En saisissant des données patients dans Vela, vous en êtes le responsable de
          traitement. À ce titre, vous vous engagez à :
        </P>
        <Ul
          items={[
            "Informer vos patients du traitement de leurs données et de l'usage de Vela.",
            "Disposer d'une base légale valable pour ce traitement (consentement, prise en charge, ou autre fondement adapté à votre pratique).",
            "Respecter le secret professionnel et les règles déontologiques de votre profession.",
            "Ne saisir que les données nécessaires à votre suivi.",
          ]}
        />
        <P>
          Vela met à disposition l&apos;outil et les mesures de sécurité. Le respect de ces
          obligations reste de votre responsabilité.
        </P>
      </Section>

      <Section title="5. Utilisation conforme">
        <P>Vous vous engagez à ne pas :</P>
        <Ul
          items={[
            "Utiliser le service à des fins illicites.",
            "Tenter d'accéder à des comptes ou données qui ne vous appartiennent pas.",
            "Perturber le fonctionnement du service ou en contourner les mesures de sécurité.",
            "Revendre ou mettre à disposition l'accès sans autorisation.",
          ]}
        />
      </Section>

      <Section title="6. Disponibilité et maintenance">
        <P>
          Nous faisons nos meilleurs efforts pour assurer un service disponible et fiable. Des
          interruptions peuvent survenir pour maintenance ou pour des raisons indépendantes de
          notre volonté. Nous vous prévenons des maintenances planifiées quand c&apos;est
          possible.
        </P>
      </Section>

      <Section title="7. Propriété intellectuelle">
        <P>
          Vela, sa marque et son code restent la propriété de Margaux FRANCILLARD (EI).
          L&apos;utilisation du service ne vous confère aucun droit de propriété sur ces
          éléments. Les données que vous saisissez restent les vôtres.
        </P>
      </Section>

      <Section title="8. Données personnelles">
        <P>
          Le traitement de vos données de praticien est décrit dans la{" "}
          <LegalLink href="/confidentialite">Politique de confidentialité</LegalLink>. Le
          traitement des données patients est encadré par l&apos;
          <LegalLink href="/sous-traitance">Accord de sous-traitance</LegalLink>, qui fait
          partie intégrante de votre contrat.
        </P>
      </Section>

      <Section title="9. Responsabilité">
        <P>
          Vela est un outil de suivi et d&apos;organisation. Il ne remplace pas votre jugement
          professionnel ni vos obligations de praticien. Nous ne sommes pas responsables des
          décisions prises dans le cadre de votre pratique.
        </P>
        <P>
          Notre responsabilité ne saurait être engagée pour les dommages indirects. Dans les
          limites permises par la loi, notre responsabilité est plafonnée au montant des sommes
          versées au titre du service sur les douze derniers mois.
        </P>
      </Section>

      <Section title="10. Durée et résiliation">
        <P>
          Le contrat court tant que votre compte est actif. Vous pouvez résilier à tout moment
          depuis votre compte ou en nous écrivant.
        </P>
        <P>
          Nous pouvons suspendre ou résilier votre accès en cas de manquement grave à ces
          conditions, après vous en avoir informé quand la situation le permet.
        </P>
        <P>
          À la fin du contrat, vos données et celles de vos patients sont traitées selon les
          modalités prévues dans l&apos;accord de sous-traitance (restitution puis suppression).
        </P>
      </Section>

      <Section title="11. Modification des conditions">
        <P>
          Ces conditions peuvent évoluer. En cas de changement significatif, nous vous en
          informons. La poursuite de l&apos;utilisation du service après notification vaut
          acceptation.
        </P>
      </Section>

      <Section title="12. Droit applicable et litiges">
        <P>
          Ces conditions sont soumises au droit français. En cas de litige, nous vous invitons à
          nous contacter d&apos;abord à margaux.francillard@gmail.com pour rechercher une
          solution amiable. À défaut, les tribunaux compétents sont ceux de Montpellier.
        </P>
      </Section>
    </article>
  );
}
