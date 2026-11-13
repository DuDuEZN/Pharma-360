/**
 * Application constants for Pharma-360
 */

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'
export const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

// Authentication
export const TOKEN_KEY = 'pharma360_token'
export const USER_KEY = 'pharma360_user'
export const REFRESH_TOKEN_KEY = 'pharma360_refresh_token'

// Token expiration buffer (in ms)
export const TOKEN_EXPIRY_BUFFER = 5 * 60 * 1000 // 5 minutes

// Application settings
export const APP_NAME = 'Pharmacie 360'
export const APP_VERSION = '1.0.0'
export const APP_DESCRIPTION = 'Système ERP de gestion de pharmacie pour le marché béninois'

// User roles
export const ROLES = {
  ADMIN: 'admin',
  MANAGER: 'manager',
  SELLER: 'seller',
  CASHIER: 'cashier',
  SUPERVISOR: 'supervisor'
}

// Role labels
export const ROLE_LABELS = {
  [ROLES.ADMIN]: 'Administrateur',
  [ROLES.MANAGER]: 'Gestionnaire',
  [ROLES.SELLER]: 'Vendeur',
  [ROLES.CASHIER]: 'Caissier',
  [ROLES.SUPERVISOR]: 'Superviseur'
}

// Stock thresholds
export const STOCK_THRESHOLDS = {
  LOW: 5,
  CRITICAL: 2,
  EXPIRING_SOON_DAYS: 30
}

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  PAGE_SIZES: [10, 20, 50, 100]
}

// Table configuration
export const TABLE = {
  DEFAULT_SORT: 'created_at',
  DEFAULT_ORDER: 'desc'
}

// Form validation messages
export const VALIDATION_MESSAGES = {
  REQUIRED: 'Ce champ est obligatoire',
  EMAIL_INVALID: 'Adresse email invalide',
  PHONE_INVALID: 'Numéro de téléphone invalide',
  MIN_LENGTH: (min) => `Doit contenir au moins ${min} caractères`,
  MAX_LENGTH: (max) => `Doit contenir au maximum ${max} caractères`,
  NUMBER_MIN: (min) => `Doit être supérieur ou égal à ${min}`,
  NUMBER_MAX: (max) => `Doit être inférieur ou égal à ${max}`
}

// Error messages
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Erreur réseau. Veuillez vérifier votre connexion.',
  SERVER_ERROR: 'Erreur serveur. Veuillez réessayer plus tard.',
  UNAUTHORIZED: 'Non autorisé. Veuillez vous connecter.',
  FORBIDDEN: 'Accès refusé. Vous n\'avez pas les permissions nécessaires.',
  NOT_FOUND: 'Ressource introuvable.',
  VALIDATION_ERROR: 'Veuillez corriger les erreurs dans le formulaire.',
  UNKNOWN_ERROR: 'Une erreur inattendue est survenue.'
}

// Success messages
export const SUCCESS_MESSAGES = {
  CREATE_SUCCESS: (resource) => `${resource} créé avec succès`,
  UPDATE_SUCCESS: (resource) => `${resource} mis à jour avec succès`,
  DELETE_SUCCESS: (resource) => `${resource} supprimé avec succès`,
  SAVE_SUCCESS: 'Modifications enregistrées avec succès'
}

// Confirmation messages
export const CONFIRMATION_MESSAGES = {
  DELETE_CONFIRM: (resource) => `Êtes-vous sûr de vouloir supprimer ${resource} ?`,
  LOGOUT_CONFIRM: 'Êtes-vous sûr de vouloir vous déconnecter ?',
  CLEAR_CONFIRM: 'Êtes-vous sûr de vouloir tout effacer ?'
}

// Date formats
export const DATE_FORMATS = {
  DISPLAY: 'DD MMMM YYYY',
  SHORT: 'DD/MM/YYYY',
  ISO: 'YYYY-MM-DD',
  TIME: 'HH:mm',
  DATETIME: 'DD/MM/YYYY HH:mm'
}

// Currency
export const CURRENCY = {
  CODE: 'XOF',
  SYMBOL: 'FCFA',
  LOCALE: 'fr-FR'
}

// Barcode settings
export const BARCODE = {
  DEFAULT_FORMAT: 'CODE128',
  SCANNER_TIMEOUT: 5000,
  AUTO_FOCUS: true
}

// Cache keys
export const CACHE_KEYS = {
  PRODUCTS: 'products',
  BATCHES: 'batches',
  SALES: 'sales',
  SUPPLIERS: 'suppliers',
  USERS: 'users',
  REPORTS: 'reports',
  DASHBOARD: 'dashboard'
}

// Local storage keys
export const STORAGE_KEYS = {
  THEME: 'pharma360_theme',
  LANGUAGE: 'pharma360_language',
  SIDEBAR_COLLAPSED: 'pharma360_sidebar_collapsed'
}

// Theme settings
export const THEME = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system'
}

// Animation durations
export const ANIMATION = {
  FAST: 150,
  NORMAL: 250,
  SLOW: 350
}
