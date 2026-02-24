"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/context/SessionContext";
import { CheckCircle, Printer, PlusCircle, LayoutDashboard, Loader2, Eye, EyeOff, Copy, ArrowLeft, Shield, User } from "lucide-react";

export default function IntakeSummaryPage() {
  const { id } = useParams();
  const router = useRouter();
  const supabase = createSupabaseClient();
  const { session } = useSession();
  
  const [loading, setLoading] = useState(true);
  const [repair, setRepair] = useState<any>(null);
  const [employeeName, setEmployeeName] = useState<string>("Staff");
  const [showPassword, setShowPassword] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lang, setLang] = useState<"EN" | "FR">("EN");

  useEffect(() => {
    if (session?.language === "EN" || session?.language === "FR") {
      setLang(session.language);
    }
  }, [session]);
  
  useEffect(() => {
  if (session?.full_name) {
    setEmployeeName(session.full_name);
    localStorage.setItem("employee_name", session.full_name);
  } else {
    const saved = localStorage.getItem("employee_name");
    if (saved) setEmployeeName(saved);
  }
}, [session]);

  const t = {
    EN: {
      title: "Repair Ticket Created",
      subtitle: "Your repair ticket has been created successfully",
      reference: "Reference",
      backToDashboard: "Back to Dashboard",
      repairDetails: "Repair Details",
      customerInfo: "Customer Information",
      fullName: "Full Name",
      phone: "Phone",
      deviceInfo: "Device Information",
      device: "Device",
      serialNumber: "Serial Number",
      type: "Type",
      reportedProblem: "Reported Problem",
      onlineTracking: "Online Tracking",
      customerCanTrack: "Customer can track repair status online",
      trackingPassword: "Tracking Password",
      copy: "Copy",
      copied: "Copied",
      showPassword: "Show",
      hidePassword: "Hide",
      sendSMS: "Send SMS",
      instructions: "Instructions",
      instructionsText: "Give this password to the customer to track their repair status online.",
      trackingURL: "Tracking URL",
      printReceipt: "Print Receipt",
      newTicket: "New Ticket",
      dashboard: "Dashboard",
      conditionAtIntake: "Condition at Intake",
      accessoriesReceived: "Accessories Received",
      showroomStamp: "Showroom Stamp",
      customerSignature: "Customer Signature",
      warrantyNote: "Warranty terms and conditions apply. Customer signature required for device release.",
      preparedBy: "Prepared by",
      employee: "Employee", 
	  sendWhatsApp: "Send WhatsApp",
      whatsappMessage: "Hello! This is TechFix. Your repair ticket has been created.\n\n📍 Reference: ",
      trackingCodeMsg: "\n🔐 Tracking Code: ",
      trackAtMsg: "\n🌐 Track here: www.techfix.com/track"
    },
	
    FR: {
      title: "Ticket Créé",
      subtitle: "Votre ticket de réparation a été créé avec succès",
      reference: "Référence",
      backToDashboard: "Retour au tableau de bord",
      repairDetails: "Détails de la Réparation",
      customerInfo: "Informations Client",
      fullName: "Nom complet",
      phone: "Téléphone",
      deviceInfo: "Informations Appareil",
      device: "Appareil",
      serialNumber: "Numéro de série",
      type: "Type",
      reportedProblem: "Problème Signalé",
      onlineTracking: "Suivi en Ligne",
      customerCanTrack: "Le client peut suivre l'état de la réparation en ligne",
      trackingPassword: "Mot de passe de suivi",
      copy: "Copier",
      copied: "Copied",
      showPassword: "Afficher",
      hidePassword: "Masquer",
      sendSMS: "Envoyer SMS",
      instructions: "Instructions",
      instructionsText: "Donnez ce mot de passe au client pour qu'il puisse suivre l'état de sa réparation en ligne.",
      trackingURL: "URL de suivi",
      printReceipt: "Imprimer le Reçu",
      newTicket: "Nouveau Ticket",
      dashboard: "Tableau de Bord",
      conditionAtIntake: "État à la réception",
      accessoriesReceived: "Accessoires reçus",
      showroomStamp: "Cachet du showroom",
      customerSignature: "Signature du client",
      warrantyNote: "Conditions de garantie applicables. Signature requise pour la récupération.",
      preparedBy: "Préparé par",
      employee: "Employé",
	  sendWhatsApp: "Envoyer WhatsApp",
      whatsappMessage: "Bonjour ! C'est TechFix. Votre ticket de réparation a été créé.\n\n📍 Référence : ",
      trackingCodeMsg: "\n🔐 Code de suivi : ",
      trackAtMsg: "\n🌐 Suivez ici : www.techfix.com/track"
    }
  };

  useEffect(() => {
    const fetchRepair = async () => {
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const { data } = await supabase
        .from("repairs")
        .select(`
          *,
          showrooms (*),
          devices (*, item_types (*), brands (*)),
          customers (*)
        `)
        .eq("id", id)
        .single();

      if (data) {
        setRepair(data);
        setLoading(false);
      }
    };
    if (id) fetchRepair();
  }, [id, supabase]);

const [settings, setSettings] = useState<any>(null);

useEffect(() => {
  const fetchRepairAndSettings = async () => {
    setLoading(true);
    
    // 1. Fetch Global Settings
    const { data: settingsData } = await supabase
      .from("settings")
      .select("*")
      .eq("id", 1)
      .single();
    if (settingsData) setSettings(settingsData);

    // 2. Fetch Repair (Now including showroom's whatsapp)
    const { data: repairData } = await supabase
      .from("repairs")
      .select(`
        *,
        showrooms (id, name, logo_url, address, phone, whatsapp_number),
        devices (*, item_types (*), brands (*)),
        customers (*)
      `)
      .eq("id", id)
      .single();

    if (repairData) {
      setRepair(repairData);
    }
    setLoading(false);
  };

  if (id) fetchRepairAndSettings();
}, [id, supabase]);


  const formatDate = (dateStr: string) => {
  // Use the date from DB or fallback to "now"
  const d = dateStr ? new Date(dateStr) : new Date();
  
  if (isNaN(d.getTime())) return { date: "10/02/2026", time: "16:42" };

  // This ensures the date is treated as local time
  return {
    date: d.toLocaleDateString(lang === "FR" ? 'fr-FR' : 'en-US', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }),
    time: d.toLocaleTimeString(lang === "FR" ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false // Force 24h format for FR/Standard
    })
  };
};

  const dt = formatDate(repair?.received_at || repair?.created_at);
  // const dt = formatDate(new Date().toISOString());

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;
  
  const isPrintFR = lang === "FR";
  
  const receiptContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${isPrintFR ? 'Reçu de Réparation' : 'Repair Receipt'} - ${repair?.repair_ref}</title>
      <meta charset="UTF-8">
      <style>
        @page {
          size: A4;
          margin: 15mm 20mm 15mm 20mm;
        }
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        
        body {
          font-family: Arial, sans-serif;
          color: black;
          background: white;
          width: 100%;
          font-size: 10pt;
          line-height: 1.3;
        }
        
        .header {
          display: flex;
          align-items: center;
          margin-bottom: 6mm;
          padding-bottom: 4mm;
          border-bottom: 1px solid #000;
        }
        
        .logo-container {
          width: 30mm;
          height: 30mm;
          margin-right: 6mm;
          flex-shrink: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .logo-img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
        }
        
        .logo-placeholder {
          width: 100%;
          height: 100%;
          background: #000;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 900;
        }
        
        .shop-info {
          flex: 1;
        }
        
        .shop-name {
          font-size: 14pt;
          font-weight: 900;
          text-transform: uppercase;
          margin: 0 0 2mm 0;
        }
        
        .shop-details {
          font-size: 9pt;
          font-weight: bold;
          line-height: 1.4;
          color: #333;
        }
        
        .prepared-by-section {
          text-align: right;
          margin-bottom: 4mm;
          font-size: 9pt;
          font-weight: bold;
          padding: 2mm 0;
          border-bottom: 1px solid #eee;
        }
        
        .prepared-by-label { color: #666; text-transform: uppercase; }
        .prepared-by-value { color: #000; font-weight: 900; }
        
        .customer-section {
          margin-bottom: 6mm;
          padding: 3mm;
          border: 1px solid #ddd;
          background: #f9f9f9;
        }
        
        .customer-label {
          font-size: 11pt;
          font-weight: 900;
          text-transform: uppercase;
          margin-bottom: 2mm;
        }
        
        .customer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm; }
        .customer-field-label { font-size: 8pt; color: #666; text-transform: uppercase; }
        .customer-field-value { font-size: 10pt; font-weight: 900; }
        
        .reference-section { margin-bottom: 6mm; padding: 3mm 0; border-bottom: 1px solid #ccc; }
        .reference-row { display: flex; justify-content: space-between; align-items: center; }
        .reference-number { font-size: 16pt; font-family: monospace; font-weight: 900; color: #1d4ed8; }
        
        .section-title { font-size: 11pt; font-weight: 900; text-transform: uppercase; margin-bottom: 3mm; }
        .device-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; }
        .device-item { padding: 2mm; border: 1px solid #ddd; background: #f9f9f9; }
        .device-label { font-size: 8pt; color: #666; text-transform: uppercase; }
        .device-value { font-size: 10pt; font-weight: 900; }
        
        .problem-content { padding: 3mm; background: #f0f0f0; border: 1px solid #ddd; border-radius: 2mm; font-weight: bold; }
        
        .dual-section { display: grid; grid-template-columns: 1fr 1fr; gap: 6mm; margin-bottom: 6mm; }
        .condition-box, .accessories-box { border: 1px solid #ddd; padding: 3mm; background: #f9f9f9; min-height: 20mm; }
        
        .tracking-section { margin-bottom: 15mm; padding: 3mm; border: 1px solid #ddd; background: #f0f0f0; text-align: center; }
        .tracking-code { font-size: 16pt; font-family: monospace; font-weight: 900; background: #fff; padding: 2mm 4mm; border: 1px dashed #94a3b8; }
        
        .signatures-section {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 30mm;
          padding-top: 8mm;
          margin-top: 10mm;
        }
        .signature-box { text-align: center; }
        .signature-label { font-size: 9pt; font-weight: bold; text-transform: uppercase; margin-bottom: 15mm; }
        .signature-line { border-bottom: 1px solid #000; width: 100%; }

        .no-break { page-break-inside: avoid; }
      </style>
    </head>
    <body>
      <div class="header no-break">
        <div class="logo-container">
          ${repair?.showrooms?.logo_url ? 
            `<img src="${repair.showrooms.logo_url}" class="logo-img" alt="Logo">` : 
            `<div class="logo-placeholder">LOGO</div>`
          }
        </div>
        <div class="shop-info">
          <div class="shop-name">${repair?.showrooms?.name || "INFOVISION MAIN SHOWROOM"}</div>
          <div class="shop-details">
            ${repair?.showrooms?.address || "Mustafa Hjayej - Ariana"} <br>
            ${isPrintFR ? 'Téléphone' : 'Phone'}: ${repair?.showrooms?.phone || "29693608"}
          </div>
        </div>
      </div>

      <div style="text-align: center; margin-bottom: 4mm;">
        <h1 style="font-size: 14pt; font-weight: 900; text-transform: uppercase; margin: 0; color: #000; border: 1.5px solid #000; display: inline-block; padding: 1.5mm 8mm;">
          ${isPrintFR ? "BON D'ENTRÉE RÉPARATION" : "REPAIR INTAKE SUMMARY"}
        </h1>
      </div>
      
      <div class="prepared-by-section no-break">
        <span class="prepared-by-label">${isPrintFR ? 'PRÉPARÉ PAR' : 'PREPARED BY'}:</span>
        <span class="prepared-by-value"> ${employeeName || "Staff"}</span>
      </div>
      
      <div class="customer-section no-break">
        <div class="customer-label">${isPrintFR ? 'CLIENT' : 'CUSTOMER'}</div>
        <div class="customer-grid">
          <div class="customer-item">
            <div class="customer-field-label">${isPrintFR ? 'NOM COMPLET' : 'FULL NAME'}</div>
            <div class="customer-field-value">${repair?.customers?.full_name || "N/A"}</div>
          </div>
          <div class="customer-item">
            <div class="customer-field-label">${isPrintFR ? 'TÉLÉPHONE' : 'PHONE'}</div>
            <div class="customer-field-value">${repair?.customers?.phone || "N/A"}</div>
          </div>
        </div>
      </div>
      
      <div class="reference-section no-break">
        <div class="reference-row">
          <div>
            <div class="reference-label">${isPrintFR ? 'RÉFÉRENCE' : 'REFERENCE'}</div>
            <div class="reference-number">${repair?.repair_ref}</div>
          </div>
          <div class="date-time">
            ${dt.date} ${dt.time}
          </div>
        </div>
      </div>
      
      <div class="device-section no-break">
        <div class="section-title">${isPrintFR ? 'APPAREIL' : 'DEVICE'}</div>
        <div class="device-grid">
          <div class="device-item">
            <div class="device-label">${isPrintFR ? 'MODÈLE' : 'MODEL'}</div>
            <div class="device-value">${repair?.devices?.brands?.name || ""} ${repair?.devices?.model || ""}</div>
          </div>
          <div class="device-item">
            <div class="device-label">${isPrintFR ? 'N° SÉRIE' : 'SERIAL NO'}</div>
            <div class="device-value">${repair?.devices?.serial_number || "N/A"}</div>
          </div>
          <div class="device-item">
            <div class="device-label">${isPrintFR ? 'TYPE' : 'TYPE'}</div>
            <div class="device-value">${repair?.devices?.item_types?.label_en || "N/A"}</div>
          </div>
        </div>
      </div>
      
      <div class="problem-section no-break">
        <div class="section-title">${isPrintFR ? 'PROBLÈME SIGNALÉ' : 'REPORTED PROBLEM'}</div>
        <div class="problem-content">${repair?.reported_problem || "N/A"}</div>
      </div>
      
      <div class="dual-section no-break">
        <div class="condition-box">
          <div class="dual-label">${isPrintFR ? 'ÉTAT À LA RÉCEPTION' : 'CONDITION AT INTAKE'}</div>
          <div class="dual-value">${repair?.intake_condition || "N/A"}</div>
        </div>
        <div class="accessories-box">
          <div class="dual-label">${isPrintFR ? 'ACCESSOIRES REÇUS' : 'ACCESSORIES RECEIVED'}</div>
          <div class="dual-value">${repair?.accessories_received || "None"}</div>
        </div>
      </div>
      
      ${repair?.password_provided && repair?.tracking_password_hash ? `
      <div class="tracking-section no-break">
        <div style="font-size: 9pt; font-weight: bold; color: #666; margin-bottom: 2mm;">${isPrintFR ? 'SUIVI EN LIGNE' : 'ONLINE TRACKING'}</div>
        <div style="font-size: 9pt; margin-bottom: 2mm;">www.infovision.com/track</div>
        <div class="tracking-code">${repair.tracking_password_hash}</div>
      </div>
      ` : ''}
      
      <div class="signatures-section no-break">
        <div class="signature-box">
          <div class="signature-label">${isPrintFR ? 'CACHET DU SHOWROOM' : 'SHOWROOM STAMP'}</div>
          <div class="signature-line"></div>
        </div>
        <div class="signature-box">
          <div class="signature-label">${isPrintFR ? 'SIGNATURE DU CLIENT' : 'CUSTOMER SIGNATURE'}</div>
          <div class="signature-line"></div>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          // Give the browser a moment to render the content
          setTimeout(function() {
            window.print();
            
            // This event fires as soon as the print/save dialog is closed
            window.onafterprint = function() {
              window.close();
            };

            // Fallback for older browsers: close after a small delay 
            // if onafterprint doesn't fire
            setTimeout(function() {
              window.close();
            }, 50);
          }, 300);
        };
      </script>
	  
    </body>
    </html>
  `;

  printWindow.document.write(receiptContent);
  printWindow.document.close();
};

  if (loading) return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="ml-3 text-gray-400">{lang === "FR" ? "Chargement..." : "Loading..."}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 md:p-6 pt-24">
      {/* Screen UI */}
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Button */}
        <div className="mb-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            {t[lang].backToDashboard}
          </button>
        </div>

        {/* Success Header */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-8 text-center screen-only">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-900/20 to-emerald-900/20 rounded-full mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            {t[lang].title}
          </h1>
          <p className="text-gray-400 mb-6 text-lg">
            {t[lang].subtitle}
          </p>
          <div className="bg-gray-900/50 p-6 rounded-xl border border-gray-700 inline-block">
            <p className="text-sm text-gray-400 mb-2">{t[lang].reference}</p>
            <p className="text-5xl font-mono font-black text-blue-400 tracking-wider">
              {repair?.repair_ref}
            </p>
          </div>
          
          {/* Employee info in screen UI */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <div className="inline-flex items-center gap-2 bg-gray-900/30 px-4 py-2 rounded-lg">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">{t[lang].preparedBy}:</span>
              <span className="text-sm font-medium text-white">{employeeName || "Staff"}</span>
            </div>
          </div>
        </div>

        {/* Repair Details Card */}
        <div className="bg-gray-800/30 backdrop-blur-sm border border-gray-700 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">{t[lang].repairDetails}</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Info */}
            <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-blue-900/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">{t[lang].customerInfo}</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">{t[lang].fullName}</p>
                  <p className="text-lg font-bold text-white">{repair?.customers?.full_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">{t[lang].phone}</p>
                  <p className="text-xl font-bold text-blue-400">{repair?.customers?.phone}</p>
                </div>
              </div>
            </div>

            {/* Device Info */}
            <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-700">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-purple-900/20 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-purple-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">{t[lang].deviceInfo}</h3>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-400">{t[lang].device}</p>
                  <p className="text-lg font-bold text-white">
                    {repair?.devices?.brands?.name} {repair?.devices?.model}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">{t[lang].serialNumber}</p>
                  <p className="text-md font-mono font-bold text-white">{repair?.devices?.serial_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">{t[lang].type}</p>
                  <p className="text-md font-medium text-white">{repair?.devices?.item_types?.label_en}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Condition & Accessories */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">{t[lang].conditionAtIntake}</h3>
              <div className="p-4 bg-black/30 rounded-lg border border-gray-800">
                <p className="text-gray-300">{repair?.intake_condition}</p>
              </div>
            </div>
            
            <div className="bg-gray-900/50 p-5 rounded-xl border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-3">{t[lang].accessoriesReceived}</h3>
              <div className="p-4 bg-black/30 rounded-lg border border-gray-800">
                <p className="text-gray-300">{repair?.accessories_received || (lang === "FR" ? "Aucun" : "None")}</p>
              </div>
            </div>
          </div>

          {/* Problem Description */}
          <div className="mt-6 bg-gray-900/50 p-5 rounded-xl border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">{t[lang].reportedProblem}</h3>
            <div className="p-4 bg-black/30 rounded-lg border border-gray-800">
              <p className="text-gray-300 italic">"{repair?.reported_problem}"</p>
            </div>
          </div>

          {/* Tracking Password Section (if enabled) */}
          {repair?.password_provided && repair?.tracking_password_hash && (
            <div className="mt-6 bg-gray-900/50 p-6 rounded-2xl border border-gray-700">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-900/20 rounded-lg">
                  <Shield className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">{t[lang].onlineTracking}</h3>
                  <p className="text-gray-400">{t[lang].customerCanTrack}</p>
                </div>
              </div>
              
              <div className="space-y-6">
                {/* Password Display - More Discrete */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-black/40 rounded-xl border border-gray-700">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-gray-400">{t[lang].trackingPassword}</p>
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-xs text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                      >
                        {showPassword ? 
                          <><EyeOff className="w-3 h-3" /> {t[lang].hidePassword}</> : 
                          <><Eye className="w-3 h-3" /> {t[lang].showPassword}</>
                        }
                      </button>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className={`text-2xl font-mono font-black ${showPassword ? 'text-green-400' : 'text-gray-300'}`}>
                        {showPassword ? repair.tracking_password_hash : '••••'}
                      </p>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      {t[lang].trackingURL}: <span className="text-blue-400">www.fixtech.com/track</span>
                    </p>
                  </div>
				  
	<style>
{`
  .screen-only {
    display: block;
  }

  .print-only-header {
    display: none;
  }

  @media print {

    .screen-only {
      display: none !important;
    }

    .print-only-header {
      display: block !important;
    }

    .min-h-screen {
      min-height: auto !important;
    }

    html, body {
      height: auto !important;
    }
  }
`}
</style>			  
				  
                  <div className="flex gap-3">
                    <button
                      onClick={() => copyToClipboard(repair.tracking_password_hash)}
                      className="px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-xl transition-colors flex items-center gap-2 font-medium"
                    >
                      <Copy className="w-4 h-4" />
                      {copied ? t[lang].copied : t[lang].copy}
                    </button>
					
                    <button
  onClick={() => {
    // 1. Check if the customer actually wants WhatsApp
    if (repair.customers.whatsapp_available === false) {
      alert(lang === "FR" ? "Ce client préfère ne pas être contacté via WhatsApp." : "This customer prefers not to be contacted via WhatsApp.");
      return;
    }

    const customerPhone = repair.customers.phone.replace(/\D/g, '');
    const company = repair?.showrooms?.name || "PC Repair Center";
    const trackingUrl = settings?.tracking_url || "www.infovision.com/track";
    
    // Get Device details
    const deviceType = repair.devices?.item_types?.label_en || "Device";
    const deviceModel = `${repair.devices?.brands?.name || ''} ${repair.devices?.model || ''}`;

    // 3. Build the more detailed message
    const message = lang === "FR" 
      ? `Bonjour ! C'est ${company}.\n\n` +
        `Votre ${deviceType} (${deviceModel}) est bien enregistré sous la référence : *${repair.repair_ref}*.\n\n` +
        `🔐 Code de suivi : ${repair.tracking_password_hash}\n` +
        `🌐 Suivez l'avancement ici : ${trackingUrl}`
      : `Hello! This is ${company}.\n\n` +
        `Your ${deviceType} (${deviceModel}) has been registered with reference: *${repair.repair_ref}*.\n\n` +
        `🔐 Tracking Code: ${repair.tracking_password_hash}\n` +
        `🌐 Track it here: ${trackingUrl}`;

    window.open(`https://wa.me/${customerPhone}?text=${encodeURIComponent(message)}`, '_blank');
  }}
  // Optional: Change button style if WhatsApp is disabled for this customer
  className={`px-4 py-3 rounded-xl transition-colors flex items-center gap-2 font-medium ${
    repair.customers.whatsapp_available === false 
    ? "bg-gray-600 cursor-not-allowed opacity-50" 
    : "bg-green-600 hover:bg-green-500"
  }`}
>
  <span>📱</span> {t[lang].sendWhatsApp}
</button>


                  </div>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-blue-900/10 border border-blue-800/30 rounded-xl">
                  <p className="text-blue-300 text-sm">
                    <strong>{t[lang].instructions}:</strong> {t[lang].instructionsText}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 pt-8 border-t border-gray-700">
            <div className="flex flex-col sm:flex-row gap-4">
              <button 
                onClick={handlePrint}
                className="flex-1 bg-blue-600 hover:bg-blue-500 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all text-lg"
              >
                <Printer className="w-6 h-6" />
                {t[lang].printReceipt}
              </button>
              
              <button 
                onClick={() => router.push('/repairs/new')}
                className="flex-1 bg-gray-800 hover:bg-gray-700 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all text-lg"
              >
                <PlusCircle className="w-6 h-6" />
                {t[lang].newTicket}
              </button>
              
              <button 
                onClick={() => router.push('/dashboard')}
                className="flex-1 bg-gray-800 hover:bg-gray-700 py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all text-lg"
              >
                <LayoutDashboard className="w-6 h-6" />
                {t[lang].dashboard}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
	
	
  );
}