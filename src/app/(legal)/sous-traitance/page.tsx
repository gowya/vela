import type { Metadata } from "next";
import { Section, P, LegalLink, LegalTable } from "../_components";

export const metadata: Metadata = {
  title: "Accord de sous-traitance — Vela",
};

export default function SousTraitancePage() {
  return (
    <article className="space-y-8">
      <header className="space-y-1">
        <h1 className="font-display text-3xl text-foreground">Accord de sous-traitance</h1>
        <p className="text-sm text-muted-foreground">
          Conforme à l&apos;article 28 du RGPD. Dernière mise à jour : 10 juillet 2026
        </p>
      </header>

      <P>
        Cet accord fait partie de votre contrat. Il encadre le traitement des données patients
        que Vela réalise pour votre compte. Vous êtes le <strong>responsable de traitement</strong>.
        Margaux FRANCILLARD (Entrepreneur Individuel), éditrice de Vela, est le{" "}
        <strong>sous-traitant</strong>.
      </P>

      <Section title="1. Objet">
        <P>
          Vela traite des données patients uniquement pour vous fournir le service de suivi
          patient, sur vos instructions et pour votre compte.
        </P>
      </Section>

      <Section title="2. Description du traitement">
        <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
          <li>
            <strong>Nature et finalité</strong> : hébergement, enregistrement, consultation,
            modification et suppression des données saisies dans le cadre du suivi patient.
          </li>
          <li>
            <strong>Durée</strong> : celle de votre contrat.
          </li>
          <li>
            <strong>Type de données</strong> : données d&apos;identité des patients, données de
            suivi et notes de consultation, et <strong>données de santé</strong> (catégorie
            particulière au sens de l&apos;article 9 du RGPD).
          </li>
          <li>
            <strong>Catégories de personnes</strong> : les patients suivis par le praticien.
          </li>
        </ul>
      </Section>

      <Section title="3. Instructions">
        <P>
          Vela traite les données uniquement sur vos instructions documentées, y compris pour
          les transferts. L&apos;utilisation du service et le présent accord constituent ces
          instructions. Si Vela estime qu&apos;une instruction viole le RGPD, elle vous en
          informe.
        </P>
      </Section>

      <Section title="4. Confidentialité">
        <P>
          Les personnes autorisées à traiter les données chez Vela sont soumises à une
          obligation de confidentialité et sont sensibilisées à la protection des données de
          santé.
        </P>
      </Section>

      <Section title="5. Sécurité">
        <P>
          Vela met en œuvre les mesures techniques et organisationnelles appropriées prévues à
          l&apos;article 32 du RGPD, notamment : chiffrement en transit et au repos, contrôle et
          journalisation des accès, sauvegardes régulières, cloisonnement des données entre
          praticiens, et hébergement certifié HDS.
        </P>
      </Section>

      <Section title="6. Hébergement des données de santé">
        <P>
          Les données patients sont hébergées chez un hébergeur certifié « Hébergeur de Données
          de Santé » (HDS), conformément à l&apos;article L.1111-8 du Code de la santé publique.
          L&apos;identité de l&apos;hébergeur figure dans les{" "}
          <LegalLink href="/mentions-legales">Mentions légales</LegalLink>.
        </P>
      </Section>

      <Section title="7. Sous-traitants ultérieurs">
        <P>
          Vous autorisez Vela à recourir aux sous-traitants ultérieurs suivants pour
          l&apos;exécution du service :
        </P>
        <LegalTable
          headers={["Sous-traitant", "Rôle", "Localisation"]}
          rows={[
            [
              "À définir (aucun hébergeur HDS souscrit à ce jour)",
              "Hébergement des données de santé",
              "À définir (Union européenne requise)",
            ],
            [
              "À définir (aucun serveur en production à ce jour)",
              "Envoi d'e-mails transactionnels",
              "À définir (Union européenne requise)",
            ],
            ["Qonto", "Gestion de la facturation (factures, devis)", "France"],
          ]}
        />
        <P>
          Vela impose à ces sous-traitants les mêmes obligations de protection. En cas de
          changement, vous êtes informé au préalable et pouvez vous y opposer pour un motif
          légitime.
        </P>
      </Section>

      <Section title="8. Droits des personnes">
        <P>
          Vela vous fournit les fonctions permettant de répondre aux demandes de vos patients
          (accès, rectification, effacement, portabilité). Si une demande est adressée
          directement à Vela, elle vous la transmet sans y répondre elle-même.
        </P>
      </Section>

      <Section title="9. Assistance">
        <P>
          Vela vous assiste, dans la mesure du possible, pour respecter vos obligations de
          sécurité, de notification de violation, d&apos;analyse d&apos;impact et de
          consultation préalable (articles 32 à 36 du RGPD).
        </P>
      </Section>

      <Section title="10. Violation de données">
        <P>
          En cas de violation de données concernant vos patients, Vela vous en informe sans
          retard injustifié après en avoir pris connaissance, avec les éléments utiles pour vous
          permettre, le cas échéant, de notifier la CNIL dans le délai de 72 heures et
          d&apos;informer les personnes concernées.
        </P>
      </Section>

      <Section title="11. Localisation">
        <P>
          Les données sont hébergées et traitées en Union européenne. Aucun transfert hors de
          l&apos;Union européenne n&apos;est réalisé sans votre autorisation préalable et sans
          les garanties exigées par le RGPD.
        </P>
      </Section>

      <Section title="12. Fin du contrat">
        <P>
          À la fin du contrat, selon votre choix, Vela vous restitue les données patients dans un
          format exploitable, puis les supprime, ou les supprime directement. Une fenêtre de 30
          jours vous est laissée pour récupérer vos données avant suppression définitive, sauf
          obligation légale de conservation.
        </P>
      </Section>

      <Section title="13. Audit et documentation">
        <P>
          Vela met à votre disposition les informations nécessaires pour démontrer le respect de
          ces obligations et permet, dans des conditions raisonnables, la réalisation
          d&apos;audits, y compris par un tiers que vous mandatez.
        </P>
      </Section>
    </article>
  );
}
