# 🎨 **DESIGN SYSTEM - PHARMA 360°**

## 📋 **Introduction**

Le **Design System** de Pharma 360° est une bibliothèque de composants, de styles et de guidelines qui permet de construire des interfaces **cohérentes**, **accessibles** et **responsives** pour l'application de gestion de pharmacie.

### **Objectifs**
✅ **Cohérence** : Même apparence et comportement partout
✅ **Réutilisabilité** : Composants modulaires et interchangeables
✅ **Accessibilité** : Conforme WCAG 2.1 AA
✅ **Responsive** : Adapté à tous les appareils
✅ **Maintenabilité** : Facile à mettre à jour et à étendre

---

## 📁 **Structure du Design System**

```
frontend/src/
├── components/
│   └── ui/                    # Composants du Design System
│       ├── Button/           # Boutons
│       │   ├── Button.jsx    # Composant principal
│       │   ├── button.jsx    # Variante simple
│       │   └── index.js      # Export
│       ├── Card/             # Cartes
│       ├── Input/            # Champs de formulaire
│       ├── Select/           # Sélecteurs
│       ├── Modal/            # Modales
│       ├── Toast/            # Notifications
│       ├── Tooltip/          # Info-bulles
│       ├── Badge/            # Badges
│       ├── Table/            # Tableaux
│       ├── Tabs/             # Onglets
│       ├── Form/             # Formulaires
│       ├── ...
│       └── index.js          # Export de tous les composants
├── styles/
│   └── index.css            # Styles globaux et utilitaires
└── lib/
    └── utils.js              # Fonctions utilitaires
```

---

## 🎨 **Fondations**

### **1. Couleurs**

#### **Palette Principale**

| Couleur | Valeur | Utilisation |
|---------|--------|-------------|
| **Primary 500** | `#3b82f6` | Boutons principaux, liens |
| **Primary 600** | `#2563eb` | Boutons principaux (hover) |
| **Primary 700** | `#1d4ed8` | Boutons principaux (active) |
| **Secondary 500** | `#64748b` | Textes secondaires, boutons secondaires |
| **Secondary 600** | `#475569` | Textes secondaires (hover) |
| **Success 500** | `#22c55e` | Messages de succès, boutons de validation |
| **Success 600** | `#16a34a` | Messages de succès (hover) |
| **Warning 500** | `#f59e0b` | Alertes, avertissements |
| **Warning 600** | `#d97706` | Alertes (hover) |
| **Danger 500** | `#ef4444` | Erreurs, boutons de suppression |
| **Danger 600** | `#dc2626` | Erreurs (hover) |

#### **Palette Neutre**

| Couleur | Valeur | Utilisation |
|---------|--------|-------------|
| **Gray 50** | `#f9fafb` | Arrière-plan clair |
| **Gray 100** | `#f3f4f6` | Arrière-plan des cartes |
| **Gray 200** | `#e5e7eb` | Bordures, séparateurs |
| **Gray 300** | `#d1d5db` | Bordures (hover) |
| **Gray 400** | `#9ca3af` | Textes tertiaires |
| **Gray 500** | `#6b7280` | Textes secondaires |
| **Gray 600** | `#4b5563` | Textes principaux |
| **Gray 700** | `#374151` | Textes importants |
| **Gray 800** | `#1f2937` | Textes très importants |
| **Gray 900** | `#111827` | Textes principaux (noir) |

#### **Utilisation dans Tailwind**
```jsx
// Utilisation des couleurs personnalisées
<button className="bg-primary-600 text-white hover:bg-primary-700">
  Bouton Principal
</button>

<button className="bg-success-600 text-white hover:bg-success-700">
  Valider
</button>

<button className="bg-danger-600 text-white hover:bg-danger-700">
  Supprimer
</button>
```

---

### **2. Typographie**

#### **Police**
- **Famille**: Inter (Google Fonts)
- **Fallback**: `system-ui, -apple-system, sans-serif`
- **Chargement**: Via Google Fonts ou local

#### **Configuration dans Tailwind**
```javascript
// tailwind.config.js
fontFamily: {
  sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
}
```

#### **Échelle Typographique**

| Style | Classe Tailwind | Taille | Utilisation |
|-------|-----------------|--------|-------------|
| **Display** | `text-4xl` | 36px | Titres principaux |
| **H1** | `text-3xl` | 30px | Titres de page |
| **H2** | `text-2xl` | 24px | Sous-titres de page |
| **H3** | `text-xl` | 20px | Titres de section |
| **H4** | `text-lg` | 18px | Sous-titres de section |
| **Body** | `text-base` | 16px | Texte principal |
| **Small** | `text-sm` | 14px | Texte secondaire |
| **X-Small** | `text-xs` | 12px | Texte tertiaire |

#### **Poids**
- **Normal**: `font-normal` (400)
- **Moyen**: `font-medium` (500)
- **Semi-Gras**: `font-semibold` (600)
- **Gras**: `font-bold` (700)

#### **Exemples**
```jsx
<h1 className="text-3xl font-bold text-gray-900">Titre de la page</h1>
<h2 className="text-2xl font-semibold text-gray-800">Sous-titre</h2>
<p className="text-base text-gray-600">Texte principal</p>
<span className="text-sm text-gray-500">Texte secondaire</span>
```

---

### **3. Espacements**

#### **Système d'Espacement**
Utilisation des classes Tailwind pour les espacements :

| Classe | Valeur | Utilisation |
|--------|--------|-------------|
| `p-0` | 0px | Pas de padding |
| `p-1` | 4px | Padding très petit |
| `p-2` | 8px | Padding petit |
| `p-3` | 12px | Padding par défaut pour les composants |
| `p-4` | 16px | Padding standard |
| `p-5` | 20px | Padding moyen |
| `p-6` | 24px | Padding pour les cartes |
| `p-8` | 32px | Padding grand |

#### **Margins**
Mêmes valeurs que pour le padding, avec le préfixe `m-` ou `mb-`, `mt-`, `ml-`, `mr-`:
```jsx
<div className="mt-4 mb-6 ml-2 mr-2">...</div>
```

#### **Gaps** (pour Flexbox et Grid)
```jsx
<div className="flex gap-2">...</div>  // 8px entre les éléments
<div className="grid gap-4">...</div>  // 16px entre les éléments
```

---

### **4. Bordures et Ombres**

#### **Bordures**

| Classe | Style | Utilisation |
|--------|-------|-------------|
| `border` | 1px solid | Bordure par défaut |
| `border-2` | 2px solid | Bordure épaisse |
| `border-gray-200` | Couleur gris clair | Bordures standard |
| `border-primary-600` | Couleur primaire | Bordures accentuées |
| `rounded-none` | 0px | Pas de bordure arrondie |
| `rounded-sm` | 2px | Bordure légèrement arrondie |
| `rounded` | 4px | Bordure arrondie par défaut |
| `rounded-lg` | 8px | Bordure arrondie (composants) |
| `rounded-xl` | 12px | Bordure très arrondie (cartes) |
| `rounded-full` | 9999px | Bordure circulaire |

#### **Exemples**
```jsx
<div className="border border-gray-200 rounded-lg p-4">Carte</div>
<button className="border border-primary-600 rounded-lg px-4 py-2">Bouton</button>
```

#### **Ombres**

| Classe | Style | Utilisation |
|--------|-------|-------------|
| `shadow-sm` | Léger | Composants subtils |
| `shadow` | Moyen | Composants standard |
| `shadow-md` | Prononcé | Cartes, modales |
| `shadow-lg` | Fort | Modales, dropdowns |
| `shadow-xl` | Très fort | Éléments flottants |

#### **Exemples**
```jsx
<div className="shadow-md rounded-lg">Carte avec ombre</div>
<div className="shadow-lg rounded-xl">Modale avec ombre</div>
```

---

## 🧩 **Composants du Design System**

### **1. Button**

#### **Props**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'warning' | 'success'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  onClick?: () => void
  disabled?: boolean
  isLoading?: boolean
  type?: 'button' | 'submit' | 'reset'
  className?: string
}
```

#### **Variantes**

| Variante | Classe | Utilisation |
|----------|--------|-------------|
| **Primary** | `bg-primary-600 text-white` | Actions principales |
| **Secondary** | `bg-secondary-100 text-secondary-700` | Actions secondaires |
| **Outline** | `border border-gray-300` | Actions discrètes |
| **Ghost** | `text-gray-700 hover:bg-gray-100` | Actions dans les menus |
| **Danger** | `bg-danger-600 text-white` | Actions destructives |
| **Warning** | `bg-warning-600 text-white` | Actions d'avertissement |
| **Success** | `bg-success-600 text-white` | Actions de validation |

#### **Tailles**

| Taille | Classe | Padding | Utilisation |
|--------|--------|---------|-------------|
| **sm** | `px-3 py-1.5 text-sm` | 12px x 6px | Boutons petits |
| **md** | `px-4 py-2 text-sm` | 16px x 8px | Boutons standard |
| **lg** | `px-6 py-3 text-base` | 24px x 12px | Boutons grands |

#### **Exemples**
```jsx
<Button variant="primary" size="md" onClick={handleClick}>
  Enregistrer
</Button>

<Button variant="secondary" size="sm" disabled>
  Annuler
</Button>

<Button variant="outline" isLoading>
  <Spinner className="w-4 h-4 mr-2" />
  Chargement...
</Button>

<Button variant="danger" size="lg">
  <Trash2 className="w-4 h-4 mr-2" />
  Supprimer
</Button>
```

---

### **2. Input**

#### **Props**
```typescript
interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'date' | 'search'
  value?: string | number
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  readonly?: boolean
  className?: string
  icon?: React.ReactNode
}
```

#### **Variantes**
- **Default**: Champ de texte standard
- **With Icon**: Avec icône à gauche ou à droite
- **With Label**: Avec label flottant ou fixe
- **With Error**: Avec message d'erreur

#### **Exemples**
```jsx
<Input 
  type="text" 
  placeholder="Entrez votre nom" 
  value={name} 
  onChange={(e) => setName(e.target.value)}
/>

<Input 
  type="email" 
  label="Email" 
  placeholder="votre@email.com"
  error={emailError}
/>

<Input 
  type="search" 
  icon={<Search className="w-5 h-5 text-gray-400" />}
  placeholder="Rechercher..."
/>
```

---

### **3. Card**

#### **Props**
```typescript
interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  onClick?: () => void
}
```

#### **Structure**
```jsx
<Card>
  <CardHeader>
    <CardTitle>Titre de la carte</CardTitle>
    <CardDescription>Description de la carte</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Contenu de la carte */}
  </CardContent>
  <CardFooter>
    {/* Pied de la carte */}
  </CardFooter>
</Card>
```

#### **Exemples**
```jsx
<Card className="shadow-md">
  <CardHeader>
    <CardTitle>Produits en stock</CardTitle>
    <CardDescription>125 produits disponibles</CardDescription>
  </CardHeader>
  <CardContent>
    <p>Liste des produits...</p>
  </CardContent>
</Card>

<Card hoverable onClick={handleClick}>
  <CardContent className="p-6">
    <div className="flex items-center gap-4">
      <Package className="w-8 h-8 text-primary-600" />
      <div>
        <h3 className="font-semibold">Produits</h3>
        <p className="text-sm text-gray-500">Gestion des stocks</p>
      </div>
    </div>
  </CardContent>
</Card>
```

---

### **4. Badge**

#### **Props**
```typescript
interface BadgeProps {
  variant?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  children: React.ReactNode
  className?: string
}
```

#### **Variantes**

| Variante | Classe | Utilisation |
|----------|--------|-------------|
| **Default** | `bg-gray-100 text-gray-700` | Statut neutre |
| **Primary** | `bg-primary-100 text-primary-700` | Statut principal |
| **Secondary** | `bg-secondary-100 text-secondary-700` | Statut secondaire |
| **Success** | `bg-success-100 text-success-700` | Statut de succès |
| **Warning** | `bg-warning-100 text-warning-700` | Statut d'avertissement |
| **Danger** | `bg-danger-100 text-danger-700` | Statut d'erreur |

#### **Exemples**
```jsx
<Badge variant="success">Actif</Badge>
<Badge variant="warning">En attente</Badge>
<Badge variant="danger">Inactif</Badge>
<Badge variant="primary">Nouveau</Badge>
```

---

### **5. Modal**

#### **Props**
```typescript
interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
  children: React.ReactNode
  closeOnOverlayClick?: boolean
  className?: string
}
```

#### **Structure**
```jsx
<Modal isOpen={isOpen} onClose={handleClose} title="Titre de la modale">
  <ModalContent>
    {/* Contenu de la modale */}
  </ModalContent>
  <ModalFooter>
    <Button variant="outline" onClick={handleClose}>
      Annuler
    </Button>
    <Button variant="primary" onClick={handleConfirm}>
      Confirmer
    </Button>
  </ModalFooter>
</Modal>
```

#### **Exemples**
```jsx
<Modal isOpen={isOpen} onClose={onClose} title="Confirmer la suppression">
  <ModalContent>
    <p>Êtes-vous sûr de vouloir supprimer ce produit ?</p>
  </ModalContent>
  <ModalFooter>
    <Button variant="outline" onClick={onClose}>
      Annuler
    </Button>
    <Button variant="danger" onClick={handleDelete}>
      Supprimer
    </Button>
  </ModalFooter>
</Modal>
```

---

### **6. Toast**

#### **Props**
```typescript
interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  duration?: number
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
  action?: {
    label: string
    onClick: () => void
  }
}
```

#### **Exemples**
```jsx
// Utilisation via le hook useToast
const { addToast } = useToast()

addToast({
  type: 'success',
  title: 'Succès',
  message: 'Produit ajouté avec succès'
})

addToast({
  type: 'error',
  title: 'Erreur',
  message: 'Impossible de charger les données',
  action: {
    label: 'Réessayer',
    onClick: () => fetchData()
  }
})
```

---

### **7. Tooltip**

#### **Props**
```typescript
interface TooltipProps {
  content: string | React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  children: React.ReactNode
  delay?: number
  className?: string
}
```

#### **Exemples**
```jsx
<Tooltip content="Ceci est un tooltip" position="top">
  <button>?</button>
</Tooltip>

<Tooltip content="Plus d'informations" position="right">
  <Info className="w-4 h-4 text-gray-400" />
</Tooltip>
```

---

### **8. Table**

#### **Props**
```typescript
interface TableProps {
  columns: Column[]
  data: any[]
  keyExtractor?: (item: any) => string
  className?: string
}

interface Column {
  key: string
  header: string | React.ReactNode
  cell?: (item: any) => React.ReactNode
  sortable?: boolean
  width?: string
}
```

#### **Exemples**
```jsx
<Table
  columns={[
    { key: 'id', header: 'ID', width: '80px' },
    { key: 'name', header: 'Nom', sortable: true },
    { key: 'price', header: 'Prix', cell: (item) => formatCurrency(item.price) },
    { key: 'actions', header: 'Actions', cell: (item) => (
      <div className="flex gap-2">
        <Button variant="ghost" size="sm">
          <Edit className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="sm">
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    ) }
  ]}
  data={products}
  keyExtractor={(item) => item.id}
/>
```

---

### **9. Form**

#### **Structure**
```jsx
<Form onSubmit={handleSubmit}>
  <FormField name="name" label="Nom" required>
    <Input 
      type="text" 
      placeholder="Entrez le nom"
      value={formData.name}
      onChange={handleChange}
    />
    <FormError>{errors.name}</FormError>
  </FormField>
  
  <FormField name="email" label="Email" required>
    <Input 
      type="email" 
      placeholder="votre@email.com"
      value={formData.email}
      onChange={handleChange}
    />
    <FormError>{errors.email}</FormError>
  </FormField>
  
  <Button type="submit" variant="primary">
    Enregistrer
  </Button>
</Form>
```

---

### **10. Select**

#### **Props**
```typescript
interface SelectProps {
  value?: string
  onChange?: (value: string) => void
  options: Option[]
  placeholder?: string
  disabled?: boolean
  error?: string
  label?: string
  className?: string
}

interface Option {
  value: string
  label: string
  disabled?: boolean
}
```

#### **Exemples**
```jsx
<Select
  value={selectedCategory}
  onChange={setSelectedCategory}
  options={categories}
  placeholder="Sélectionnez une catégorie"
  label="Catégorie"
/>

<Select
  value={status}
  onChange={setStatus}
  options={[
    { value: 'active', label: 'Actif' },
    { value: 'inactive', label: 'Inactif' }
  ]}
  error={statusError}
/>
```

---

## 🎨 **Patterns de Design**

### **1. Empty State**

Utilisé quand il n'y a pas de données à afficher.

```jsx
<EmptyState
  icon={<Package className="w-12 h-12" />}
  title="Aucun produit trouvé"
  description="Commencez par ajouter un nouveau produit"
>
  <Button variant="primary" onClick={handleAddProduct}>
    <Plus className="w-4 h-4 mr-2" />
    Ajouter un produit
  </Button>
</EmptyState>
```

---

### **2. Loading State**

Utilisé pendant le chargement des données.

```jsx
<LoadingState>
  <Spinner className="w-8 h-8" />
  <p>Chargement en cours...</p>
</LoadingState>

// Ou avec un skeleton
<Card>
  <Skeleton className="h-4 w-3/4 mb-2" />
  <Skeleton className="h-4 w-1/2 mb-4" />
  <Skeleton className="h-32 w-full" />
</Card>
```

---

### **3. Confirmation Dialog**

Utilisé pour les actions destructives ou importantes.

```jsx
<ConfirmationDialog
  title="Confirmer la suppression"
  message="Êtes-vous sûr de vouloir supprimer ce produit ? Cette action est irréversible."
  confirmLabel="Supprimer"
  cancelLabel="Annuler"
  variant="danger"
  onConfirm={handleDelete}
  onCancel={handleCancel}
/>
```

---

### **4. Stats Card**

Utilisé pour afficher des métriques.

```jsx
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard
    icon={<DollarSign className="w-6 h-6" />}
    title="Chiffre d'affaires"
    value={formatCurrency(totalSales)}
    change={formatPercentage(salesChange)}
    changeType="increase"
  />
  
  <StatCard
    icon={<ShoppingCart className="w-6 h-6" />}
    title="Ventes totales"
    value={totalSalesCount}
    change={formatPercentage(salesCountChange)}
    changeType="increase"
  />
  
  <StatCard
    icon={<Package className="w-6 h-6" />}
    title="Produits"
    value={totalProducts}
    change={formatPercentage(productsChange)}
    changeType="decrease"
  />
  
  <StatCard
    icon={<Users className="w-6 h-6" />}
    title="Clients"
    value={totalCustomers}
    change={formatPercentage(customersChange)}
    changeType="increase"
  />
</div>
```

---

### **5. Data Table avec Actions**

```jsx
<Card>
  <CardHeader>
    <CardTitle>Liste des produits</CardTitle>
    <div className="flex gap-2">
      <Input 
        placeholder="Rechercher..." 
        icon={<Search className="w-5 h-5" />}
      />
      <Button variant="primary">
        <Plus className="w-4 h-4 mr-2" />
        Ajouter
      </Button>
    </div>
  </CardHeader>
  
  <CardContent>
    <Table
      columns={[
        { key: 'barcode', header: 'Code-barres' },
        { key: 'name', header: 'Nom' },
        { key: 'category', header: 'Catégorie' },
        { key: 'price', header: 'Prix' },
        { key: 'stock', header: 'Stock' },
        { key: 'actions', header: 'Actions' }
      ]}
      data={products}
    />
  </CardContent>
  
  <CardFooter>
    <Pagination 
      total={totalPages} 
      current={currentPage} 
      onChange={setCurrentPage}
    />
  </CardFooter>
</Card>
```

---

### **6. Formulaire avec Validation**

```jsx
<Card>
  <CardHeader>
    <CardTitle>Nouveau produit</CardTitle>
    <CardDescription>Remplissez les informations du produit</CardDescription>
  </CardHeader>
  
  <CardContent>
    <Form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField name="name" label="Nom" required>
          <Input 
            placeholder="Nom du produit" 
            value={formData.name}
            onChange={handleChange}
          />
          <FormError>{errors.name}</FormError>
        </FormField>
        
        <FormField name="barcode" label="Code-barres" required>
          <Input 
            placeholder="Code-barres" 
            value={formData.barcode}
            onChange={handleChange}
          />
          <FormError>{errors.barcode}</FormError>
        </FormField>
        
        <FormField name="category" label="Catégorie" required>
          <Select
            value={formData.category}
            onChange={(value) => handleChange({ target: { name: 'category', value } })}
            options={categories}
            placeholder="Sélectionnez une catégorie"
          />
          <FormError>{errors.category}</FormError>
        </FormField>
        
        <FormField name="price" label="Prix de vente" required>
          <Input 
            type="number" 
            placeholder="0.00" 
            value={formData.price}
            onChange={handleChange}
          />
          <FormError>{errors.price}</FormError>
        </FormField>
      </div>
      
      <div className="flex justify-end gap-2 mt-6">
        <Button variant="outline" type="button" onClick={handleCancel}>
          Annuler
        </Button>
        <Button variant="primary" type="submit" isLoading={isSubmitting}>
          Enregistrer
        </Button>
      </div>
    </Form>
  </CardContent>
</Card>
```

---

## 📱 **Responsive Design Patterns**

### **1. Navigation Responsive**

```jsx
// Sidebar responsive (collapsible sur mobile)
<div className="fixed left-0 top-0 z-40 h-screen w-64 bg-white border-r border-gray-200 lg:translate-x-0 -translate-x-full transition-transform duration-300">
  {/* Contenu de la sidebar */}
</div>

// Bouton pour toggler la sidebar sur mobile
<button 
  className="lg:hidden p-2 rounded-lg hover:bg-gray-100"
  onClick={() => setSidebarOpen(!sidebarOpen)}
>
  <Menu className="w-5 h-5" />
</button>

// Overlay pour fermer la sidebar sur mobile
<div 
  className={`fixed inset-0 bg-black/50 z-30 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}
  onClick={() => setSidebarOpen(false)}
/>
```

---

### **2. Grille Responsive**

```jsx
// Grille qui s'adapte à la taille de l'écran
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
  {items.map((item) => (
    <Card key={item.id} className="hover:shadow-lg transition-shadow">
      {/* Contenu de la carte */}
    </Card>
  ))}
</div>
```

---

### **3. Tableau Responsive**

```jsx
// Tableau avec défilement horizontal sur mobile
div className="overflow-x-auto">
  <table className="min-w-full">
    <thead>
      <tr>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nom</th>
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Prix</th>
        {/* Autres colonnes */}
      </tr>
    </thead>
    <tbody>
      {/* Lignes du tableau */}
    </tbody>
  </table>
</div>

// Alternative: Tableau stacké sur mobile
<div className="block md:table w-full">
  {/* En-têtes visibles seulement sur desktop */}
  <div className="hidden md:table-header-group">
    <table className="min-w-full">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nom</th>
          {/* ... */}
        </tr>
      </thead>
    </table>
  </div>
  
  {/* Lignes stackées sur mobile */}
  <div className="md:table-row-group">
    {items.map((item) => (
      <div key={item.id} className="md:table-row">
        <div className="md:table-cell p-4 border-b md:border-b-0 block md:table-cell">
          <span className="md:hidden font-medium text-gray-500">ID: </span>
          {item.id}
        </div>
        <div className="md:table-cell p-4 border-b md:border-b-0 block md:table-cell">
          <span className="md:hidden font-medium text-gray-500">Nom: </span>
          {item.name}
        </div>
        {/* Autres cellules */}
      </div>
    ))}
  </div>
</div>
```

---

### **4. Formulaire Responsive**

```jsx
// Formulaire qui s'adapte à la taille de l'écran
<div className="w-full max-w-4xl mx-auto">
  <Form onSubmit={handleSubmit}>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <FormField name="field1" label="Champ 1">
        <Input />
      </FormField>
      
      <FormField name="field2" label="Champ 2">
        <Input />
      </FormField>
      
      <FormField name="field3" label="Champ 3">
        <Input />
      </FormField>
      
      {/* Sur desktop, ces 3 champs seront sur la même ligne */}
      {/* Sur tablette, 2 champs par ligne */}
      {/* Sur mobile, 1 champ par ligne */}
    </div>
    
    <div className="flex justify-end gap-2 mt-6">
      <Button variant="outline" type="button">Annuler</Button>
      <Button variant="primary" type="submit">Enregistrer</Button>
    </div>
  </Form>
</div>
```

---

### **5. Images Responsive**

```jsx
// Image qui s'adapte à son conteneur
<img 
  src={imageUrl} 
  alt={altText}
  className="w-full h-auto object-cover rounded-lg"
/>

// Image avec ratio fixe
<div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
  <img 
    src={imageUrl} 
    alt={altText}
    className="w-full h-full object-cover"
  />
</div>

// Image avec différentes tailles selon l'écran
<img 
  src={imageUrl} 
  alt={altText}
  className="w-full h-48 md:h-64 lg:h-80 object-cover rounded-lg"
/>
```

---

## ♿ **Accessibilité**

### **1. Bonnes Pratiques Générales**

- **Tous les éléments interactifs** doivent avoir un `focus` visible
- **Tous les images** doivent avoir un `alt` descriptif
- **Tous les formulaires** doivent avoir des `label` associés
- **Tous les boutons** doivent avoir un texte descriptif
- **Les contrastes** doivent respecter WCAG (4.5:1 pour le texte)

### **2. Exemples Concrets**

```jsx
// ✅ Bon: Bouton avec texte et icône
<button onClick={handleClick} className="focus:outline-none focus:ring-2 focus:ring-primary-500">
  <Icon className="w-4 h-4 mr-2" />
  Enregistrer
</button>

// ❌ Mauvais: Bouton avec seulement une icône
<button onClick={handleClick}>
  <Icon className="w-4 h-4" />
</button>

// ✅ Bon: Input avec label
<div className="space-y-1">
  <Label htmlFor="name">Nom du produit</Label>
  <Input id="name" type="text" />
</div>

// ❌ Mauvais: Input sans label
<Input type="text" placeholder="Nom" />

// ✅ Bon: Image avec alt descriptif
<img 
  src={product.image} 
  alt={`Photo du produit ${product.name}`} 
  className="w-full h-auto"
/>

// ❌ Mauvais: Image avec alt vide
<img src={product.image} alt="" />

// ✅ Bon: Lien descriptif
<Link to="/products" className="focus:outline-none focus:ring-2 focus:ring-primary-500">
  Voir tous les produits
</Link>

// ❌ Mauvais: Lien non descriptif
<Link to="/products">Cliquez ici</Link>
```

### **3. Navigation au Clavier**

- **Tab**: Navigation entre les éléments interactifs
- **Enter**: Activation des boutons et liens
- **Espace**: Activation des boutons
- **Échap**: Fermeture des modales et menus
- **Flèches**: Navigation dans les menus et sélecteurs

### **4. Focus Visible**

```css
/* Dans index.css */
*:focus-visible {
  @apply outline-none ring-2 ring-primary-500 ring-offset-2;
}
```

### **5. ARIA (Accessible Rich Internet Applications)**

```jsx
// Bouton avec état de chargement
<button 
  onClick={handleClick}
  disabled={isLoading}
  aria-busy={isLoading}
  aria-label={isLoading ? "Chargement en cours" : "Enregistrer"}
>
  {isLoading ? <Spinner /> : "Enregistrer"}
</button>

// Menu dropdown
<div className="relative">
  <button 
    onClick={() => setOpen(!open)}
    aria-expanded={open}
    aria-haspopup="true"
  >
    Menu
  </button>
  
  {open && (
    <div role="menu" aria-label="Menu principal">
      <button role="menuitem">Option 1</button>
      <button role="menuitem">Option 2</button>
    </div>
  )}
</div>

// Onglets
<Tabs defaultValue="tab1">
  <TabsList role="tablist">
    <TabsTrigger value="tab1" role="tab" aria-selected={true}>
      Onglet 1
    </TabsTrigger>
    <TabsTrigger value="tab2" role="tab" aria-selected={false}>
      Onglet 2
    </TabsTrigger>
  </TabsList>
  
  <TabsContent value="tab1" role="tabpanel" aria-labelledby="tab1">
    Contenu 1
  </TabsContent>
</Tabs>
```

---

## 🎯 **Checklist pour les Développeurs**

### **Avant de commencer un composant**
- [ ] J'ai lu la documentation du Design System
- [ ] J'ai vérifié si un composant similaire existe déjà
- [ ] J'ai compris les spécifications
- [ ] J'ai identifié les props nécessaires

### **Pendant le développement**
- [ ] Je respecte les conventions de nommage
- [ ] J'utilise les classes Tailwind appropriées
- [ ] Je rend le composant responsive
- [ ] Je rend le composant accessible
- [ ] J'ajoute des commentaires si nécessaire
- [ ] Je documente les props avec TypeScript/JSDoc

### **Avant de merger**
- [ ] Le composant fonctionne correctement
- [ ] Le composant est responsive (testé sur mobile, tablette, desktop)
- [ ] Le composant est accessible (vérifié avec axe-core)
- [ ] Le code est propre et bien structuré
- [ ] Les tests passent
- [ ] La documentation est à jour

---

## 📚 **Ressources**

### **Documentation**
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [React Documentation](https://react.dev)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG/2.1/)
- [Accessibility Best Practices](https://webaim.org/)

### **Outils**
- [Tailwind Play](https://play.tailwindcss.com) - Pour tester les styles
- [Storybook](https://storybook.js.org) - Pour documenter les composants
- [Figma](https://www.figma.com) - Pour les maquettes
- [axe-core](https://github.com/dequelabs/axe-core) - Pour tester l'accessibilité
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/) - Pour tester les performances

---

## 🎉 **Conclusion**

Ce Design System est conçu pour vous aider à créer des interfaces **cohérentes**, **accessibles** et **responsives** pour Pharma 360°. En suivant ces guidelines et en utilisant ces composants, vous contribuerez à une expérience utilisateur exceptionnelle.

**Objectif**: Un frontend **beautiful**, **functional** et **accessible** pour les pharmacies.

---

*Document créé pour le projet Pharma 360° - Design System*
*Version: 1.0*
*Date: 2024*
