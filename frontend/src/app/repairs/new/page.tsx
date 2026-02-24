"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { useSession } from "@/context/SessionContext";
import { 
  ArrowLeft, 
  User, 
  Smartphone, 
  AlertCircle,
  Shield,
  Package,
  PlusCircle,
  CheckCircle,
  Phone,
  Mail,
  MapPin,
  Tag,
  Briefcase,
  Wrench,
  Key,
  Save,
  X,
  Loader2,
  Zap,
  Clock,
  Crown,
  RefreshCcw,
  MinusCircle
} from "lucide-react";

export default function NewRepairPage() {
  const router = useRouter();
  const supabase = createSupabaseClient();
  const { session, loadingSession } = useSession();

  /* ---------- TEMP -------------- */
  useEffect(() => {
    supabase.auth.getSession().then(res => {
      console.log("SUPABASE SESSION:", res.data.session);
    });
  }, []);

  /* ---------- LANGUAGE ---------- */
  const [lang, setLang] = useState<"EN" | "FR">("EN");
  useEffect(() => {
    if (session?.language === "EN" || session?.language === "FR") {
      setLang(session.language);
    }
  }, [session]);

  /* ---------- STATE ---------- */
  const [loading, setLoading] = useState(false);
  const [itemTypes, setItemTypes] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [showrooms, setShowrooms] = useState<any[]>([]); // To store the list of showrooms
  const [selectedShowroomId, setSelectedShowroomId] = useState(""); // The actual ID used for the intake
  
  
  const [isAddingBrand, setIsAddingBrand] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
    
  const [itemTypeId, setItemTypeId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [model, setModel] = useState("");
  const [serialNumber, setSerialNumber] = useState("");

  const [reportedProblem, setReportedProblem] = useState("");
  const [intakeCondition, setIntakeCondition] = useState("");
  const [accessories, setAccessories] = useState("");
  
  // NEW PRIORITY STATE
  const [priority, setPriority] = useState("normal");

  const [enableTracking, setEnableTracking] = useState(false);
  const [trackingPassword, setTrackingPassword] = useState("");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  const [activeStep, setActiveStep] = useState(0);
  const steps = ["Customer", "Device", "Problem", "Tracking"];
  
  /* ---------- VALIDATION STATE ---------- */
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  
    /* ---------- VALIDATION RULES ---------- */
  const validateField = (name: string, value: string): string => {
    switch (name) {
      case 'customerName':
        if (!value.trim()) return lang === "FR" ? "Le nom est requis" : "Name is required";
        if (value.trim().length < 2) return lang === "FR" ? "Le nom doit contenir au moins 2 caractères" : "Name must be at least 2 characters";
        return '';
      
      case 'customerPhone':
  setCustomerPhone(value);
  // Trigger search when phone number is complete (e.g., 8 digits for Tunisia)
  const digits = value.replace(/\D/g, '');
  if (digits.length === 8) {
    const fetchExistingCustomer = async () => {
      const { data } = await supabase
        .from("customers")
        .select("full_name, email, address")
        .eq("phone", value.trim())
        .eq("showroom_id", selectedShowroomId) // Ensures customer belongs to this branch
        .maybeSingle();

      if (data) {
        setCustomerName(data.full_name || "");
        setCustomerEmail(data.email || "");
        setCustomerAddress(data.address || "");
        // Manually mark fields as touched so the UI updates
        setTouched(prev => ({ 
          ...prev, 
          customerName: true, 
          customerEmail: true,
          customerAddress: true 
        }));
      }
    };
    fetchExistingCustomer();
  }
  break;
      
      case 'customerEmail':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return lang === "FR" ? "Adresse email invalide" : "Invalid email address";
        }
        return '';
      
      case 'itemTypeId':
        if (!value) return lang === "FR" ? "Le type d'appareil est requis" : "Device type is required";
        return '';
      
      case 'model':
        if (!value.trim()) return lang === "FR" ? "Le modèle est requis" : "Model is required";
        if (value.trim().length < 2) return lang === "FR" ? "Le modèle doit contenir au moins 2 caractères" : "Model must be at least 2 characters";
        return '';
      
      case 'reportedProblem':
        if (!value.trim()) return lang === "FR" ? "Le problème signalé est requis" : "Reported problem is required";
        if (value.trim().length < 10) return lang === "FR" ? "Veuillez décrire le problème plus en détail" : "Please describe the problem in more detail";
        return '';
      
      case 'intakeCondition':
        if (!value.trim()) return lang === "FR" ? "L'état à la réception est requis" : "Condition at intake is required";
        if (value.trim().length < 5) return lang === "FR" ? "Veuillez décrire l'état plus en détail" : "Please describe the condition in more detail";
        return '';
      
      case 'trackingPassword':
        if (enableTracking && value.length !== 4) {
          return lang === "FR" ? "Le mot de passe doit contenir 4 chiffres" : "Password must be 4 digits";
        }
        if (enableTracking && !/^\d{4}$/.test(value)) {
          return lang === "FR" ? "Le mot de passe doit contenir uniquement des chiffres" : "Password must contain only digits";
        }
        return '';
      
      default:
        return '';
    }
  };

  /* ---------- FIELD HANDLERS WITH VALIDATION ---------- */
  const handleBlur = (fieldName: string) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    let value = '';
    switch (fieldName) {
      case 'customerName': value = customerName; break;
      case 'customerPhone': value = customerPhone; break;
      case 'customerEmail': value = customerEmail; break;
      case 'itemTypeId': value = itemTypeId; break;
      case 'model': value = model; break;
      case 'reportedProblem': value = reportedProblem; break;
      case 'intakeCondition': value = intakeCondition; break;
      case 'trackingPassword': value = trackingPassword; break;
    }
    
    const error = validateField(fieldName, value);
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  };

  const handleChange = (fieldName: string, value: string) => {
    // Update the corresponding state
    switch (fieldName) {
      case 'customerName': setCustomerName(value); break;
      case 'customerPhone': setCustomerPhone(value); break;
      case 'customerEmail': setCustomerEmail(value); break;
      case 'itemTypeId': setItemTypeId(value); break;
      case 'model': setModel(value); break;
      case 'reportedProblem': setReportedProblem(value); break;
      case 'intakeCondition': setIntakeCondition(value); break;
      case 'trackingPassword': setTrackingPassword(value); break;
    }
    
    // If field has been touched and there's an error, re-validate on change
    if (touched[fieldName]) {
      const error = validateField(fieldName, value);
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  };

  /* ---------- STEP VALIDATION ---------- */
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (step === 0) {
      const nameError = validateField('customerName', customerName);
      const phoneError = validateField('customerPhone', customerPhone);
      const emailError = validateField('customerEmail', customerEmail);
      
      if (nameError) newErrors.customerName = nameError;
      if (phoneError) newErrors.customerPhone = phoneError;
      if (emailError) newErrors.customerEmail = emailError;
      
      // Mark all fields in this step as touched
      setTouched(prev => ({
        ...prev,
        customerName: true,
        customerPhone: true,
        customerEmail: true
      }));
    }
    
    if (step === 1) {
      const itemTypeError = validateField('itemTypeId', itemTypeId);
      const modelError = validateField('model', model);
      
      if (itemTypeError) newErrors.itemTypeId = itemTypeError;
      if (modelError) newErrors.model = modelError;
      
      setTouched(prev => ({
        ...prev,
        itemTypeId: true,
        model: true
      }));
    }
    
    if (step === 2) {
      const problemError = validateField('reportedProblem', reportedProblem);
      const conditionError = validateField('intakeCondition', intakeCondition);
      
      if (problemError) newErrors.reportedProblem = problemError;
      if (conditionError) newErrors.intakeCondition = conditionError;
      
      setTouched(prev => ({
        ...prev,
        reportedProblem: true,
        intakeCondition: true
      }));
    }
    
    if (step === 3 && enableTracking) {
      const passwordError = validateField('trackingPassword', trackingPassword);
      if (passwordError) newErrors.trackingPassword = passwordError;
      
      setTouched(prev => ({
        ...prev,
        trackingPassword: true
      }));
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ---------- LOAD LOOKUPS ---------- */
  useEffect(() => {
	const loadShowrooms = async () => {
    // Only fetch if user is admin
    if (session?.role === 'admin') {
      const { data } = await supabase
        .from("showrooms")
        .select("id, name")
        .order("name");
      if (data) setShowrooms(data);
    } else if (session?.showroom?.id) {
      // If not admin, automatically set the showroom from session
      setSelectedShowroomId(session.showroom.id);
    }
  };
    const loadItemTypes = async () => {
      const { data } = await supabase
        .from("item_types")
        .select("id, label_en, label_fr")
        .eq("is_active", true)
        .order("label_en");
      if (data) setItemTypes(data);
    };

    const loadBrands = async () => {
      const { data } = await supabase
        .from("brands")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (data) setBrands(data);
    };

    loadItemTypes();
    loadBrands();
	loadShowrooms();
  }, [supabase]);

  /* ---------- I18N ---------- */
  const I18N = {
    EN: {
      title: "New Repair Intake",
      subtitle: "Create a new repair ticket for customer service",
      customer: "Customer Information",
      cDetails: "Enter customer details",
      name: "Full Name",
      phone: "Phone Number",
      email: "Email Address",
      address: "Physical Address",
      itemInfo: "Device Information",
      itemType: "Device Type",
      brand: "Manufacturer Brand",
      model: "Device Model",
      serialNumber: "Serial Number (optional)",
      problemCondition: "Problem & Condition",
      reportedProblem: "Reported Problem",
      intakeCondition: "Condition at Intake",
      accessories: "Accessories Received",
      priorityLabel: "Service Priority",
      priorities: {
        top: "Top",
        urgent: "Urgent",
        vip: "VIP",
        warranty: "Warranty",
        normal: "Normal",
        low: "Low"
      },
      customerTracking: "Customer Online Tracking",
      enableTracking: "Enable online tracking for customer",
      trackingPassword: "Tracking Password",
      createIntake: "Create Intake Ticket",
      cancel: "Cancel",
      selectItemType: "Select device type",
      selectBrand: "Select brand",
      required: "Required",
      optional: "Optional",
      next: "Next",
      previous: "Previous",
      step: "Step",
      of: "of",
      loading: "Creating repair ticket...",
      errorPhoneRequired: "Customer phone number is required",
      errorSession: "Session not ready",
      success: "Repair ticket created successfully!",
    },
    FR: {
      title: "Nouvelle prise en charge",
      subtitle: "Créer un nouveau ticket de réparation",
      customer: "Informations client",
      cDetails: "Saisir les détails du client",
      name: "Nom complet",
      phone: "Numéro de téléphone",
      email: "Adresse email",
      address: "Adresse physique",
      itemInfo: "Informations appareil",
      itemType: "Type d'appareil",
      brand: "Marque du fabricant",
      model: "Modèle d'appareil",
      serialNumber: "Numéro de série (optionnel)",
      problemCondition: "Problème & état",
      reportedProblem: "Problème signalé",
      intakeCondition: "État à la réception",
      accessories: "Accessoires reçus",
      priorityLabel: "Priorité du service",
      priorities: {
        top: "Immense",
        urgent: "Urgent",
        vip: "Client VIP",
        warranty: "Garantie",
        normal: "Normal",
        low: "Basse"
      },
      customerTracking: "Suivi client en ligne",
      enableTracking: "Activer le suivi client",
      trackingPassword: "Mot de passe de suivi",
      createIntake: "Créer le ticket",
      cancel: "Annuler",
      selectItemType: "Sélectionner le type",
      selectBrand: "Sélectionner la marque",
      required: "Requis",
      optional: "Optionnel",
      next: "Suivant",
      previous: "Précédent",
      step: "Étape",
      of: "sur",
      loading: "Création du ticket...",
      errorPhoneRequired: "Le numéro de téléphone est requis",
      errorSession: "Session non prête",
      success: "Ticket créé avec succès !",
    },
  };

  const t = I18N[lang];
  
  /* ---------- HELPERS ---------- */
  const generateRepairRef = async () => {
    if (!session?.showroom) {
      throw new Error("Session showroom missing");
    }

    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("repairs")
      .select("*", { count: "exact", head: true })
      .eq("showroom_id", session.showroom.id)
      .gte("created_at", `${year}-01-01`);

    const next = String((count || 0) + 1).padStart(6, "0");
    return `R-${year}-${next}`;
  };
  
  /* ---------- QUICK ADD BRAND ---------- */
  const handleAddBrand = async () => {
    const name = prompt(lang === "FR" ? "Nom de la nouvelle marque :" : "New brand name:");
    
    // 1. If user cancels or types nothing, stop.
    if (!name || name.trim() === "") return;

    try {
      // 2. Insert into Supabase
      const { data, error } = await supabase
        .from('brands')
        .insert([{ 
          name: name.trim().toUpperCase(),
          is_active: true 
        }])
        .select()
        .single();

      if (error) throw error;

      // 3. Update the local list so it appears in the dropdown immediately
      setBrands(prev => [...prev, data].sort((a, b) => a.name.localeCompare(b.name)));
      
      // 4. Automatically select the newly created brand
      setBrandId(data.id);

    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  /* ---------- CREATE INTAKE ---------- */
  const handleCreateIntake = async () => {
  // Task 2: Use selectedShowroomId (which works for Admin or Staff)
  const targetShowroomId = selectedShowroomId;

  if (!targetShowroomId || !session?.id) {
    alert(lang === "FR" ? "Veuillez sélectionner un showroom" : "Please select a showroom");
    return;
  }

  let isValid = true;
  for (let i = 0; i < steps.length; i++) {
    if (!validateStep(i)) {
      isValid = false;
      setActiveStep(i);
      break;
    }
  }
  if (!isValid) return;

  setLoading(true);

  try {
    // TASK 1: Fix Time (One hour early)
    // Most databases expect UTC, but you want to store the "Moment" it happened.
    // We will use the database's own timestamp to ensure accuracy.
    const now = new Date();
    const currentYear = now.getFullYear();

    // 2. FETCH the master counter
    const { data: showroom, error: sError } = await supabase
      .from('showrooms')
      .select('current_serial_year, last_serial_number')
      .eq('id', targetShowroomId)
      .single();

    if (sError) throw sError;

    let nextSeq = (showroom.current_serial_year === currentYear) 
      ? (showroom.last_serial_number || 0) + 1 
      : 1;

    // 4. Update Master Counter
    await supabase
      .from('showrooms')
      .update({ last_serial_number: nextSeq, current_serial_year: currentYear })
      .eq('id', targetShowroomId);

    const finalRepairRef = `${currentYear}/${String(nextSeq).padStart(4, "0")}`;

    // TASK 3: Handle Customer (Update name if phone exists)
    let customerId;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id, full_name")
      .eq("phone", customerPhone.trim())
      .eq("showroom_id", targetShowroomId)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
      // If name is different, update it!
      if (existingCustomer.full_name !== customerName.trim()) {
        await supabase
          .from("customers")
          .update({ 
            full_name: customerName.trim(),
            email: customerEmail || null,
            address: customerAddress || null 
          })
          .eq("id", customerId);
      }
    } else {
      const { data: newCustomer, error: createError } = await supabase
        .from("customers")
        .insert({
          full_name: customerName.trim(),
          phone: customerPhone.trim(),
          email: customerEmail || null,
          address: customerAddress || null,
          showroom_id: targetShowroomId,
        })
        .select("id")
        .single();
      if (createError) throw createError;
      customerId = newCustomer.id;
    }
    
    // 4. Create Device
    const { data: deviceData, error: deviceError } = await supabase
      .from("devices")
      .insert({
        device_type_id: itemTypeId || null,
        brand_id: brandId || null,
        model: model.trim(),
        serial_number: serialNumber || null,
        customer_id: customerId,
        showroom_id: targetShowroomId
      })
      .select("id")
      .single();

    if (deviceError) throw deviceError;

    // 5. Create Repair Ticket
    const { data: repairData, error: repairError } = await supabase
      .from("repairs")
      .insert({
        repair_ref: finalRepairRef,
        repair_seq: nextSeq,
        repair_year: currentYear,
        customer_id: customerId,
        device_id: deviceData.id,
        showroom_id: targetShowroomId,
        prepared_by: session.id,
        reported_problem: reportedProblem,
        intake_condition: intakeCondition,
        accessories_received: accessories,
        priority: priority,
        password_provided: enableTracking,
        tracking_password_hash: enableTracking ? trackingPassword : null,
        status: 'received',
        repair_phase: 'intake',
        // Fix Task 1: Use 'now()' string to let Postgres handle local time if needed
        // or just ensure the ISO string is sent correctly.
        received_at: new Date().toISOString() 
      })
      .select("id")
      .single();

    if (repairError) throw repairError;
    router.push(`/repairs/${repairData.id}/intake-summary`);

  } catch (error: any) {
    console.error("DEBUG:", error);
    alert(`Error: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

  const nextStep = () => {
    if (validateStep(activeStep)) {
      if (activeStep < steps.length - 1) setActiveStep(activeStep + 1);
    }
  };

  const prevStep = () => {
    if (activeStep > 0) setActiveStep(activeStep - 1);
  };

  // PRIORITY UI OPTIONS
  const priorityOptions = [
    { id: 'top', label: t.priorities.top, icon: Zap, color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/50' },
    { id: 'urgent', label: t.priorities.urgent, icon: AlertCircle, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/50' },
    { id: 'vip', label: t.priorities.vip, icon: Crown, color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/50' },
    { id: 'warranty', label: t.priorities.warranty, icon: RefreshCcw, color: 'text-yellow-500', bg: 'bg-yellow-500/10', border: 'border-yellow-500/50' },
    { id: 'normal', label: t.priorities.normal, icon: Clock, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/50' },
    { id: 'low', label: t.priorities.low, icon: MinusCircle, color: 'text-gray-400', bg: 'bg-gray-500/10', border: 'border-gray-500/50' },
  ];

if (loadingSession) {
    // While the context is still reading LocalStorage, show the spinner
    // We add key="loader-root" to prevent the 'removeChild' crash
    return (
      <div key="loader-root" className="min-h-screen bg-gradient-to-br from-gray-900 to-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
          <p className="text-gray-400">Loading session...</p>
        </div>
      </div>
    );
  }

  // Final check: if there is no session and not loading, redirecting
  if (!session) return null;

  return (
    <div key="form-root" className="min-h-screen bg-gradient-to-br from-gray-900 to-black p-4 pt-24">
      <div className="max-w-4xl mx-auto">
	  
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              {t.cancel}
            </button>
            <div className="h-6 w-px bg-gray-700" />
            <div>
              <h1 className="text-3xl font-bold text-white">{t.title}</h1>
              <p className="text-gray-400">{t.subtitle}</p>
            </div>
          </div>
		  
		  		  
          {/* Progress Steps */}
          <div className="mb-10">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step} className="flex flex-col items-center relative">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                        index <= activeStep
                          ? "bg-blue-600 border-blue-500 text-white"
                          : "bg-gray-800 border-gray-700 text-gray-500"
                      }`}
                    >
                      {index < activeStep ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-16 h-0.5 ${
                        index < activeStep ? "bg-blue-600" : "bg-gray-700"
                      }`} />
                    )}
                  </div>
                  <span className={`text-sm mt-2 ${
                    index === activeStep ? "text-white font-medium" : "text-gray-500"
                  }`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-center text-sm text-gray-500">
              {t.step} {activeStep + 1} {t.of} {steps.length}
            </div>
          </div>
        </div>
		
		{/* TASK 2: SHOWROOM SELECTOR FOR ADMIN */}
        {session?.role === 'admin' && (
          <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
            <label className="block text-sm font-medium text-blue-400 mb-2 flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              {lang === "FR" ? "Assigner au Showroom" : "Assign to Showroom"}
            </label>
            <select
              value={selectedShowroomId}
              onChange={(e) => setSelectedShowroomId(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            >
              <option value="">{lang === "FR" ? "Sélectionnez un showroom" : "Select a showroom"}</option>
              {showrooms.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )} 

        {/* Form */}
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl border border-gray-700 p-6">
          <form onSubmit={(e) => { e.preventDefault(); handleCreateIntake(); }}>
            
            {/* Step 1: Customer */}
            {activeStep === 0 && (
  <div className="space-y-6">
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-lg bg-blue-900/20">
        <User className="w-6 h-6 text-blue-400" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-white">{t.customer}</h3>
        <p className="text-gray-400 text-sm">{t.cDetails}</p>
      </div>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* 1. PHONE NUMBER (Moved to First) */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t.phone} <span className="text-blue-400">*</span>
        </label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="tel"
            value={customerPhone}
            onChange={(e) => handleChange('customerPhone', e.target.value)}
            onBlur={() => handleBlur('customerPhone')}
            className={`w-full pl-10 pr-4 py-3 bg-gray-900 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
              errors.customerPhone ? 'border-red-500' : 'border-gray-700'
            }`}
            placeholder="+1 (555) 123-4567"
          />
        </div>
        {errors.customerPhone && (
          <p className="mt-1 text-sm text-red-400">{errors.customerPhone}</p>
        )}
      </div>

      {/* 2. NAME */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t.name} <span className="text-blue-400">*</span>
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => handleChange('customerName', e.target.value)}
          onBlur={() => handleBlur('customerName')}
          className={`w-full px-4 py-3 bg-gray-900 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
            errors.customerName ? 'border-red-500' : 'border-gray-700'
          }`}
          placeholder="John Doe"
        />
        {errors.customerName && (
          <p className="mt-1 text-sm text-red-400">{errors.customerName}</p>
        )}
      </div>

      {/* 3. EMAIL */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t.email} <span className="text-gray-500 text-xs">({t.optional})</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="email"
            value={customerEmail}
            onChange={(e) => handleChange('customerEmail', e.target.value)}
            onBlur={() => handleBlur('customerEmail')}
            className={`w-full pl-10 pr-4 py-3 bg-gray-900 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
              errors.customerEmail ? 'border-red-500' : 'border-gray-700'
            }`}
            placeholder="customer@example.com"
          />
        </div>
        {errors.customerEmail && (
          <p className="mt-1 text-sm text-red-400">{errors.customerEmail}</p>
        )}
      </div>

      {/* 4. ADDRESS */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t.address} <span className="text-gray-500 text-xs">({t.optional})</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
          <input
            type="text"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            placeholder="123 Main St, City"
          />
        </div>
      </div>
    </div>
  </div>
)}

           {/* Step 2: Device */}
{activeStep === 1 && (
  <div className="space-y-6">
    {/* Header */}
    <div className="flex items-center gap-3 mb-6">
      <div className="p-2 rounded-lg bg-purple-900/20">
        <Smartphone className="w-6 h-6 text-purple-400" />
      </div>
      <div>
        <h3 className="text-xl font-semibold text-white">{t.itemInfo}</h3>
        <p className="text-gray-400 text-sm">Enter device details</p>
      </div>
    </div>

    {/* Form Grid */}
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
      
      {/* 1. Device Type */}
      <div className="flex flex-col">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t.itemType} <span className="text-blue-400">*</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Tag className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <select
              value={itemTypeId}
              onChange={(e) => handleChange('itemTypeId', e.target.value)}
              onBlur={() => handleBlur('itemTypeId')}
              className={`w-full pl-10 pr-4 py-3 bg-gray-900 border rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
                errors.itemTypeId ? 'border-red-500' : 'border-gray-700'
              }`}
            >
              <option value="">{t.selectItemType}</option>
              {itemTypes.map((it) => (
                <option key={it.id} value={it.id}>
                  {lang === "FR" ? it.label_fr : it.label_en}
                </option>
              ))}
            </select>
          </div>
          {/* Spacer to keep alignment identical to Brand field */}
          <div className="w-[52px] hidden md:block"></div>
        </div>
        {errors.itemTypeId && (
          <p className="mt-1 text-sm text-red-400">{errors.itemTypeId}</p>
        )}
      </div>

      {/* 2. Brand */}
      <div className="flex flex-col">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t.brand} <span className="text-gray-500 text-xs">({t.optional})</span>
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-500" />
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white appearance-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            >
              <option value="">{t.selectBrand}</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={handleAddBrand}
            className="p-3 bg-gray-800 border border-gray-700 rounded-xl text-blue-400 hover:bg-gray-700 transition-colors"
          >
            <PlusCircle className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* 3. Model */}
      <div className="flex flex-col">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t.model} <span className="text-blue-400">*</span>
        </label>
        <input
          type="text"
          value={model}
          onChange={(e) => handleChange('model', e.target.value)}
          onBlur={() => handleBlur('model')}
          className={`w-full px-4 py-3 bg-gray-900 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${
            errors.model ? 'border-red-500' : 'border-gray-700'
          }`}
          placeholder="iPhone 14 Pro Max"
        />
        {errors.model && (
          <p className="mt-1 text-sm text-red-400">{errors.model}</p>
        )}
      </div>

      {/* 4. Serial Number */}
      <div className="flex flex-col">
        <label className="block text-sm font-medium text-gray-300 mb-2">
          {t.serialNumber}
        </label>
        <input
          type="text"
          value={serialNumber}
          onChange={(e) => setSerialNumber(e.target.value)}
          className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
          placeholder="C39LJ5FG2ML7"
        />
      </div>

    </div> {/* End Grid */}
  </div> // End Step 2 Container
)}

            {/* Step 3: Problem & Condition */}
            {activeStep === 2 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-red-900/20">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{t.problemCondition}</h3>
                    <p className="text-gray-400 text-sm">Describe the issue and condition</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* PRIORITY SELECTOR */}
                  <div className="space-y-3">
                    <label className="block text-sm font-medium text-gray-300">
                      {t.priorityLabel} <span className="text-blue-400">*</span>
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
                      {priorityOptions.map((opt) => {
                        const Icon = opt.icon;
                        const isSelected = priority === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setPriority(opt.id)}
                            className={`flex flex-col items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                              isSelected 
                                ? `${opt.bg} ${opt.border} ring-2 ring-blue-500/20` 
                                : 'bg-gray-900 border-gray-800 hover:border-gray-600'
                            }`}
                          >
                            <Icon className={`w-5 h-5 ${isSelected ? opt.color : 'text-gray-500'}`} />
                            <span className={`text-[10px] font-bold uppercase ${isSelected ? opt.color : 'text-gray-500'}`}>
                              {opt.label}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.reportedProblem} <span className="text-blue-400">*</span>
                    </label>
                    <textarea
                      value={reportedProblem}
                      onChange={(e) => handleChange('reportedProblem', e.target.value)}
                      onBlur={() => handleBlur('reportedProblem')}
                      rows={4}
                      className={`w-full px-4 py-3 bg-gray-900 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none ${
                        errors.reportedProblem ? 'border-red-500' : 'border-gray-700'
                      }`}
                      placeholder="Describe the problem as reported by the customer..."
                    />
                    {errors.reportedProblem && (
                      <p className="mt-1 text-sm text-red-400">{errors.reportedProblem}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.intakeCondition} <span className="text-blue-400">*</span>
                    </label>
                    <div className="relative">
                      <Wrench className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                      <textarea
                        value={intakeCondition}
                        onChange={(e) => handleChange('intakeCondition', e.target.value)}
                        onBlur={() => handleBlur('intakeCondition')}
                        rows={3}
                        className={`w-full pl-10 pr-4 py-3 bg-gray-900 border rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none ${
                          errors.intakeCondition ? 'border-red-500' : 'border-gray-700'
                        }`}
                        placeholder="Describe the physical condition of the device..."
                      />
                    </div>
                    {errors.intakeCondition && (
                      <p className="mt-1 text-sm text-red-400">{errors.intakeCondition}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t.accessories}
                    </label>
                    <div className="relative">
                      <Package className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                      <textarea
                        value={accessories}
                        onChange={(e) => setAccessories(e.target.value)}
                        rows={2}
                        className="w-full pl-10 pr-4 py-3 bg-gray-900 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                        placeholder="Charger, case, cables, etc..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Tracking */}
            {activeStep === 3 && (
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-green-900/20">
                    <Shield className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{t.customerTracking}</h3>
                    <p className="text-gray-400 text-sm">Set up customer tracking access</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-xl border border-gray-700">
                    <div className="flex items-center gap-3">
                      <Key className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-white font-medium">{t.enableTracking}</p>
                        <p className="text-gray-500 text-sm">Customer can track repair status online</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableTracking}
                        onChange={(e) => {
                          setEnableTracking(e.target.checked);
                          if (e.target.checked && !trackingPassword) {
                            const random4Digit = Math.floor(1000 + Math.random() * 9000);
                            setTrackingPassword(random4Digit.toString());
                          }
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {enableTracking && (
                    <div className="p-4 bg-gray-900/30 rounded-xl border border-gray-700 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">
                          {t.trackingPassword}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={trackingPassword}
                            onChange={(e) => handleChange('trackingPassword', e.target.value)}
                            onBlur={() => handleBlur('trackingPassword')}
                            className={`flex-1 px-4 py-3 bg-gray-900 border rounded-xl text-white font-mono text-center focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                              errors.trackingPassword ? 'border-red-500' : 'border-gray-700'
                            }`}
                            placeholder="4-digit code"
                            maxLength={4}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const random4Digit = Math.floor(1000 + Math.random() * 9000);
                              setTrackingPassword(random4Digit.toString());
                            }}
                            className="px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-colors"
                          >
                            Generate
                          </button>
                        </div>
                        {errors.trackingPassword && (
                          <p className="mt-1 text-sm text-red-400">{errors.trackingPassword}</p>
                        )}
                      </div>
                      
                      <div className="p-3 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                        <p className="text-sm text-blue-300">
                          <strong>Note:</strong> This 4-digit code will be printed on the receipt and used by the customer to track repair status online.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between items-center pt-8 mt-8 border-t border-gray-700">
              <button
                type="button"
                onClick={prevStep}
                disabled={activeStep === 0 || loading}
                className={`px-6 py-3 rounded-xl transition-colors font-medium ${
                  activeStep === 0 ? "invisible" : "text-gray-400 hover:text-white hover:bg-gray-800"
                }`}
              >
                ← {t.previous}
              </button>

              <div className="flex items-center gap-4">
                {activeStep < steps.length - 1 ? (
                  <button
                    type="button"
                    onClick={nextStep}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all flex items-center gap-2"
                  >
                    {t.next} →
                  </button>
                ) : (
                  <button
                    type="button" 
                    onClick={handleCreateIntake}
                    disabled={loading}
                    className="px-8 py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-bold transition-all flex items-center gap-2 disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        {t.loading}
                      </>
                    ) : (
                      <>
                        <Save className="w-5 h-5" />
                        {t.createIntake}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}