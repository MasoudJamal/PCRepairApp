"use client";

type Props = {
  repair: any;
  language: "EN" | "FR";
};

const I18N = {
  EN: {
    title: "REPAIR INTAKE RECEIPT",
    customer: "Customer Information",
    device: "Item Information",
    reportedProblem: "Reported Problem",
    intakeCondition: "Condition at Intake",
    accessories: "Accessories Received",
    portal: "Customer Portal Access",
    portalNote:
      "A tracking password has been set for this repair. Use it to follow the repair online.",
    disclaimer: "Disclaimer",
    disclaimerText:
      "The device is left at the owner's risk. We are not responsible for data loss. Unclaimed devices may incur storage fees.",
  },

  FR: {
    title: "REÇU DE DÉPÔT POUR RÉPARATION",
    customer: "Informations client",
    device: "Objet déposé",
    reportedProblem: "Problème signalé",
    intakeCondition: "État à la réception",
    accessories: "Accessoires reçus",
    portal: "Accès portail client",
    portalNote:
      "Un mot de passe de suivi a été défini pour cette réparation.",
    disclaimer: "Avertissement",
    disclaimerText:
      "L’appareil est déposé aux risques du propriétaire. Nous ne sommes pas responsables de la perte de données. Des frais de stockage peuvent s’appliquer.",
  },
};

export default function IntakeReceipt({ repair, language }: Props) {
  const t = I18N[language];

  return (
  <div
    style={{
      padding: 30,
      maxWidth: 800,
      margin: "0 auto",
      fontFamily: "Arial",
      color: "#000",
    }}
  >
    {/* HEADER */}
    <div style={{ display: "flex", justifyContent: "space-between" }}>
      <div>
        <h2 style={{ margin: 0 }}>{t.title}</h2>
        <div style={{ fontSize: 13 }}>
          Ref: <strong>{repair.repair_ref}</strong>
        </div>
        <div style={{ fontSize: 13 }}>
          {new Date(repair.received_at).toLocaleDateString()}
        </div>
      </div>

      {repair.showroom?.logo_url && (
        <img
          src={repair.showroom.logo_url}
          alt="Showroom Logo"
          style={{ height: 60 }}
        />
      )}
    </div>

    <hr />

    {/* CUSTOMER */}
    <Section title={t.customer}>
      <Line label="Name" value={repair.customer.full_name} />
      <Line label="Phone" value={repair.customer.phone} />
    </Section>

    {/* DEVICE */}
    <Section title={t.device}>
      <Line label="Brand" value={repair.device.brand} />
      <Line label="Model" value={repair.device.model} />
      <Line label="Serial" value={repair.device.serial_number} />
    </Section>

    {/* PROBLEM */}
    <Section title={t.reportedProblem}>
      <p>{repair.reported_problem || "-"}</p>
    </Section>

    {/* CONDITION */}
    <Section title={t.intakeCondition}>
      <p>{repair.intake_condition || "-"}</p>
    </Section>

    {/* ACCESSORIES */}
    <Section title={t.accessories}>
      <p>{repair.accessories_received || "-"}</p>
    </Section>

    {/* PORTAL */}
    {repair.password_provided && (
      <Section title={t.portal}>
        <p>{t.portalNote}</p>
      </Section>
    )}

    <hr />

    {/* DISCLAIMER */}
    <Section title={t.disclaimer}>
      <p style={{ fontSize: 12 }}>{t.disclaimerText}</p>
    </Section>
  </div>
);
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 18 }}>
      <h4 style={{ marginBottom: 6 }}>{title}</h4>
      {children}
    </div>
  );
}

function Line({
  label,
  value,
}: {
  label: string;
  value?: string;
}) {
  return (
    <div style={{ fontSize: 14 }}>
      <strong>{label}:</strong> {value || "-"}
    </div>
  );
}