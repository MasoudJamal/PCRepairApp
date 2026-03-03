// Component Interface

type IntakeReceiptProps = {
  repair: {
    repair_ref: string;
    received_at: string;
    reported_problem: string;
    intake_condition: string;
    accessories_received: string;
    data_importance: string;
    tracking_password_plain?: string; // ⚠️ shown ONCE
    customer: {
      full_name: string;
      phone: string;
      email?: string;
    };
    showroom: {
      name: string;
      address?: string;
      phone?: string;
      logo_url?: string;
    };
    item: {
      type: string;
      brand?: string;
      model?: string;
      serial_number?: string;
    };
  };
  language: "EN" | "FR";
};

// Translations (Embedded, Simple)

const labels = {
  EN: {
    title: "Repair Intake Receipt",
    subtitle: "Device received for repair",
    customer: "Customer",
    item: "Item",
    problem: "Reported Problem",
    condition: "Intake Condition",
    accessories: "Accessories Received",
    tracking: "Online Repair Tracking",
    reference: "Reference",
    password: "Password",
    disclaimer:
      "The customer acknowledges the device condition and agrees to the repair terms.",
  },
  FR: {
    title: "Bon de dépôt réparation",
    subtitle: "Appareil reçu pour réparation",
    customer: "Client",
    item: "Article",
    problem: "Problème signalé",
    condition: "État à la réception",
    accessories: "Accessoires reçus",
    tracking: "Suivi de réparation en ligne",
    reference: "Référence",
    password: "Mot de passe",
    disclaimer:
      "Le client reconnaît l'état de l'appareil et accepte les conditions de réparation.",
  },
};

// Receipt Layout (HTML)

export default function IntakeReceipt({ repair, language }: IntakeReceiptProps) {
  const t = labels[language];

  return (
    <div className="receipt">
      {/* HEADER */}
      <header className="receipt-header">
        {repair.showroom.logo_url && (
          <img src={repair.showroom.logo_url} alt="Logo" />
        )}
        <div>
          <h1>{repair.showroom.name}</h1>
          <p>{repair.showroom.address}</p>
          <p>{repair.showroom.phone}</p>
        </div>
      </header>

      <hr />

      {/* TITLE */}
      <h2>{t.title}</h2>
      <p className="subtitle">{t.subtitle}</p>

      {/* REPAIR INFO */}
      <section>
        <strong>{t.reference}:</strong> {repair.repair_ref}<br />
        <strong>Date:</strong>{" "}
        {new Date(repair.received_at).toLocaleDateString()}
      </section>

      {/* CUSTOMER */}
      <section>
        <h3>{t.customer}</h3>
        <p>{repair.customer.full_name}</p>
        <p>{repair.customer.phone}</p>
        {repair.customer.email && <p>{repair.customer.email}</p>}
      </section>

      {/* ITEM */}
      <section>
        <h3>{t.item}</h3>
        <p>{repair.item.type}</p>
        <p>{repair.item.brand} {repair.item.model}</p>
        <p>SN: {repair.item.serial_number}</p>
      </section>

      {/* PROBLEM */}
      <section>
        <h3>{t.problem}</h3>
        <p>{repair.reported_problem}</p>
      </section>

      {/* TRACKING */}
      {repair.tracking_password_plain && (
        <section className="tracking-box">
          <h3>{t.tracking}</h3>
          <p>{t.reference}: {repair.repair_ref}</p>
          <p>{t.password}: <strong>{repair.tracking_password_plain}</strong></p>
        </section>
      )}

      {/* DISCLAIMER */}
      <footer>
        <p>{t.disclaimer}</p>
        <div className="signature">
          Signature: ______________________
        </div>
      </footer>
    </div>
  );
}

