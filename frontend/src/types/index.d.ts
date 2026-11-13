/**
 * Type definitions for Pharma-360 Frontend
 */

// User types
export type UserRole = 'admin' | 'manager' | 'seller' | 'cashier' | 'supervisor'

export interface User {
  id: string
  username: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

// Product types
export interface Product {
  id: string
  name: string
  description: string
  barcode: string
  category: string
  price: number
  cost_price: number
  unit: string
  min_stock: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// Batch types
export interface Batch {
  id: string
  product_id: string
  product: Product
  quantity: number
  expiry_date: string
  purchase_price: number
  supplier_id: string
  min_stock_threshold: number
  status: 'active' | 'expired' | 'low_stock' | 'inactive'
  created_at: string
  updated_at: string
}

// Sale types
export interface SaleItem {
  id: string
  product_id: string
  product: Product
  batch_id: string
  batch: Batch
  quantity: number
  unit_price: number
  total_price: number
}

export interface Sale {
  id: string
  sale_number: string
  customer_name?: string
  items: SaleItem[]
  subtotal: number
  tax: number
  discount: number
  total_amount: number
  payment_method: 'cash' | 'credit' | 'mobile'
  status: 'pending' | 'completed' | 'cancelled'
  created_at: string
  updated_at: string
  created_by: string
  user: User
}

// Supplier types
export interface Supplier {
  id: string
  name: string
  contact: string
  email: string
  phone: string
  address: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// Invoice types
export interface Invoice {
  id: string
  invoice_number: string
  supplier_id: string
  supplier: Supplier
  date: string
  items: InvoiceItem[]
  subtotal: number
  tax: number
  total_amount: number
  status: 'pending' | 'paid' | 'cancelled'
  created_at: string
  updated_at: string
}

export interface InvoiceItem {
  id: string
  product_id: string
  product: Product
  quantity: number
  unit_price: number
  total_price: number
}

// Stock Movement types
export interface StockMovement {
  id: string
  batch_id: string
  batch: Batch
  type: 'in' | 'out' | 'adjustment' | 'return'
  quantity: number
  previous_quantity: number
  new_quantity: number
  reason: string
  created_at: string
  created_by: string
  user: User
}

// Alert types
export type AlertType = 'info' | 'success' | 'warning' | 'error'

export interface Alert {
  id: string
  type: AlertType
  title: string
  message: string
  duration?: number
  dismissible?: boolean
}

// Notification types
export interface Notification {
  id: string
  title: string
  message: string
  type: AlertType
  read: boolean
  created_at: string
}

// Dashboard types
export interface DashboardStats {
  total_sales: number
  total_revenue: number
  total_products: number
  low_stock_count: number
  expiring_soon_count: number
  active_users: number
  pending_invoices: number
}

export interface ChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    backgroundColor?: string | string[]
    borderColor?: string | string[]
  }[]
}

// Table types
export interface Column {
  key: string
  header: string
  sortable?: boolean
  render?: (value: any, row: any) => React.ReactNode
}

export interface Pagination {
  page: number
  page_size: number
  total: number
  total_pages: number
}

export interface TableState {
  page: number
  page_size: number
  sort_by: string
  sort_order: 'asc' | 'desc'
  search: string
}

// Form types
export interface FormError {
  field: string
  message: string
}

export interface FormState<T> {
  data: T
  errors: FormError[]
  isSubmitting: boolean
  isValid: boolean
}

// API Response types
export interface ApiResponse<T> {
  data: T
  message?: string
  success: boolean
}

export interface PaginatedResponse<T> {
  data: T[]
  pagination: Pagination
}

export interface ApiError {
  message: string
  errors?: FormError[]
  status_code: number
}

// Auth types
export interface LoginCredentials {
  username: string
  password: string
}

export interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

// Theme types
export type Theme = 'light' | 'dark' | 'system'

export interface ThemeContextType {
  theme: Theme
  setTheme: (theme: Theme) => void
}

// Sidebar types
export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  roles?: UserRole[]
  children?: NavItem[]
}

// Modal types
export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

// Select types
export interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

// Search types
export interface SearchParams {
  query: string
  category?: string
  status?: string
  date_range?: {
    start: string
    end: string
  }
}

// Filter types
export interface Filter {
  field: string
  operator: 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'starts_with' | 'ends_with'
  value: any
}

// Export all types
export type {
  UserRole,
  User,
  Product,
  Batch,
  SaleItem,
  Sale,
  Supplier,
  Invoice,
  InvoiceItem,
  StockMovement,
  AlertType,
  Alert,
  Notification,
  DashboardStats,
  ChartData,
  Column,
  Pagination,
  TableState,
  FormError,
  FormState,
  ApiResponse,
  PaginatedResponse,
  ApiError,
  LoginCredentials,
  AuthState,
  Theme,
  ThemeContextType,
  NavItem,
  ModalProps,
  SelectOption,
  SearchParams,
  Filter
}
