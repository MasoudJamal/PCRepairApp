export const fr = {
  common: {
    back: "Retour",
    cancel: "Annuler",
    save: "Enregistrer",
    saving: "Enregistrement...",
    save_failed: "Échec de l'enregistrement",
    delete: "Supprimer",
    loading: "Chargement…",
    active: "Actif",
    inactive: "Inactif",
    actions: "Actions",
    currency: "TND",
    search: "Rechercher...",
    create: "Créer",
    edit: "Modifier",
    yes: "Oui",
    no: "Non",
    confirm: "Confirmer",
    success: "Succès",
    error: "Erreur",
    warning: "Avertissement",
    info: "Information",
  },

  dashboard: {
    dashboard: "Tableau de bord",
    welcome: "Bienvenue",
    access: "Accédez à vos outils et informations depuis le tableau de bord.",
    newRepair: "Nouvelle réparation",
    logout: "Déconnexion",
    ChangePWD: "🔒 Changer mon mot de passe",
  },

  devices: {
    title: "Appareils Autorisés",
    subtitle: "Gérer la sécurité matérielle et l'accès CPU-ID",
    status: {
      pending: "En attente",
      active: "Actif",
      inactive: "Inactif"
    },
    stats: {
      total: "Total Appareils",
      pending: "En attente",
      active: "Actifs",
      inactive: "Bloqués"
    },
    filters: {
      all: "Tous",
      pending: "En attente",
      active: "Actifs",
      inactive: "Inactifs"
    },
    table: {
      user: "Demandeur",
      showroom: "Showroom",
      device: "Détails Appareil",
      status: "Statut",
      actions: "Actions",
      deviceId: "ID CPU",
      firstSeen: "Première vue",
      noShowroom: "Aucun Showroom"
    },
    actions: {
      approve: "Approuver",
      replace: "Remplacer",
      reject: "Rejeter",
      noActions: "Géré"
    },
    messages: {
      loading: "Récupération du registre...",
      empty: "Aucun appareil trouvé",
      emptyFiltered: (filter: string) => `Aucun appareil (${filter}) trouvé`,
      tryFilters: "Essayez de changer les filtres",
      awaitingApprovalWarning: "Alerte Sécurité : Nouveaux appareils en attente d'accès.",
      confirmReplace: "Cela désactivera l'appareil actuel pour ce showroom. Continuer ?",
      confirmReject: "Voulez-vous vraiment rejeter cette demande ?"
    },
    ui: {
      refresh: "Actualiser",
      manufacturer: "Fabricant",
      model: "Modèle",
      unknown: "Invité",
      notAvailable: "N/D",
      toggleStatus: "Activer / désactiver l’appareil"
    }
  },

  roles: {
    admin: "Administrateur",
    manager: "Responsable",
    employee: "Employé",
    driver: "Chauffeur",
  },

  users: {
    welcome: "Bienvenue",
    dashboard: "Tableau de bord",
    title: "Gestion des utilisateurs",
    user: "Utilisateur",
    name: "Nom",
    fullName: "Nom complet",
    role: "Rôle",
    language: "Langue",
    english: "Anglais",
    french: "Français",
    showroom: "Salle d’exposition",
    create: "Créer un utilisateur",
    edit: "Modifier",
    status: "Statut",
    back: "Retour au tableau de bord",
  },

  editUser: {
    title: "Modifier l’utilisateur",
    password: "Nouveau mot de passe",
    confirmDelete: "Voulez-vous vraiment supprimer cet utilisateur ?",
    passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères",
    subtitle: "Modifier les informations et les autorisations de l'utilisateur",
    leaveblank: "Laisser vide pour conserver les modifications"
  },

  createUser: {
    title: "Créer un utilisateur",
    password: "Mot de passe",
    passwordTooShort: "Le mot de passe doit contenir au moins 6 caractères",
    missingFullName: "Le nom complet est requis",
    missingUsername: "Le nom d’utilisateur est requis",
    missingShowroom: "Veuillez sélectionner une salle d’exposition",
    active: "Actif",
    create: "Créer un utilisateur",
    cancel: "Annuler",
  },

  showrooms: {
    title: "Gérer le salle d’exposition",
    loading: "Chargement des magasins...",
    create: "Créer un magasin",
    name: "Nom de la salle",
    address: "Adresse",
    phone: "Numéro de téléphone",
    balance: "Solde",
    markup: "Marge par défaut (%)",
    actions: "Actions",
    edit: "Modifier",
    manage: "Entrer dans le magasin",
    empty: "Aucun magasin trouvé",
    notes: "Notes internes",
    save: "Enregistrer",
    cancel: "Annuler",
    searchPlaceholder: "Rechercher des salles d'exposition par nom, adresse ou téléphone...",
    totalShowrooms: "Salles d'exposition totales",
    totalBalance: "Solde total",
    averageMarkup: "Marge moyenne",
    missingPhone: "Téléphone manquant",
    active: "Actif",
    inactive: "Inactif",
    phoneMissing: "Numéro de téléphone manquant",
    noAddress: "Aucune adresse fournie",
    noPhone: "Aucun téléphone fourni",
    viewDetails: "Voir les détails",
    goToDashboard: "Aller au tableau de bord",
    manageSettings: "Gérer les paramètres",
    createFirstShowroom: "Créer la première salle d'exposition",
    clearSearch: "Effacer la recherche",
    stats: {
      title: "Statistiques des salles d'exposition",
      total: "Total",
      average: "Moyenne",
      issues: "Problèmes",
    },
    logo: "Logo de la salle d'exposition",
    chooseF: "Choisir un fichier",
    currency: "Devise",
    noLogo: "Aucun logo sélectionné",
    line1: "Ligne juridique 1 (par exemple RC / MF)",
    line2: "Ligne juridique 2",
    line3: "Ligne juridique 3",
  },

  showroomsList: {
    title: "Salles d’exposition",
    name: "Name",
    address: "Address",
    balance: "Balance",
    actions: "Actions",
    create: "Créer une salle",
    edit: "Modifier",
    loading: "Chargement des salles…",
  },

  validation: {
    name_required: "Le nom est obligatoire",
    invalid_markup: "La marge doit être entre 0 et 100",
  },

  currencies: {
    TND: "TND — Dinar Tunisien",
    USD: "USD — Dollar Américain",
    EUR: "EUR — Euro",
    GBP: "GBP — Livre Sterling",
    CAD: "CAD — Dollar Canadien",
    JOD: "JOD — Dinar jordanien",
  },

  parameters: {
    header: "Paramètres du système",
    active: "Actif",
    inactive: "Inactif",
  },
 itemTypes: {
  title: "Types d'articles",
  subtitle: "Configurez des catégories telles que Ordinateur portable, Moniteur, Ordinateur de bureau",
  nameLabel: "Nom du type",
  add: "Ajouter un type d'élément",
},
brands: {
  title: "Marques",
  subtitle: "Gérer des fabricants comme HP, Dell, Asus, Samsung",
  nameLabel: "Nom de marque",
  add: "Ajouter une marque",
},
parameters: {
  itemTypes: {
    title: "Types d'articles",
    code: "Code (Unique)",
    labelEn: "Libellé (Anglais)",
    labelFr: "Libellé (Français)",
  },
  brands: {
    title: "Marques",
    name: "Nom de la marque",
  }
}

};