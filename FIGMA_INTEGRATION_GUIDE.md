# 
# 

---

## **SOMMAIRE**

---

## **1. INTRODUCTION**

### **1.1 Pourquoi Figma ?**
Figma est l'outil de **design collaboratif** idéal pour la refonte du frontend Pharma 360° car il permet :

✅ **Collaboration en temps réel** - Plusieurs designers et développeurs peuvent travailler simultanément
✅ **Design System intégré** - Création et gestion des composants réutilisables
✅ **Prototypage interactif** - Simulation des flux utilisateurs avant développement
✅ **Handoff aux développeurs** - Export du code CSS, inspection des propriétés
✅ **Versioning et historique** - Suivi des changements et restauration facile
✅ **Plugins puissants** - Intégration avec Storybook, Zeplin, etc.

### **1.2 Objectifs de l'Intégration Figma**

| Objectif | Description | Responsable |
|----------|-------------|--------------|
| **Créer le Design System** | Définir tous les composants UI dans Figma | Frontend Lead |
| **Prototyper les flux** | Simuler les parcours utilisateurs | UX Specialist |
| **Documenter les spécifications** | Ajouter les mesures, couleurs, typographie | Frontend Team |
| **Faciliter le handoff** | Exporter le code pour les développeurs | Frontend Dev |
| **Maintenir la cohérence** | Assurer l'uniformité entre design et code | Tous |

---

## **2. CONFIGURATION DE FIGMA**

### **2.1 Création du Projet Figma**

#### **Étape 1 : Créer un nouveau projet**
1. Accéder à [Figma](https://figma.com) et se connecter
2. Cliquer sur **"New Design File"** ou **"Create New"**
3. Nommer le fichier : **"Pharma 360° - Frontend Refactor"**

#### **Étape 2 : Configurer le Workspace**
```
Pharma 360° - Frontend Refactor/
├── 📁 Design System/
│   ├── 📄 Colors.md
│   ├── 📄 Typography.md
│   ├── 📄 Components/
│   │   ├── 📄 Button.jsx
│   │   ├── 📄 Input.jsx
│   │   ├── 📄 Card.jsx
│   │   └── ...
│   └── 📄 Styles/
│       ├── 📄 Colors
│       ├── 📄 Text Styles
│       └── 📄 Effects
├── 📁 Pages/
│   ├── 📄 Login/
│   ├── 📄 Dashboard/
│   ├── 📄 Products/
│   ├── 📄 Sales/
│   ├── 📄 Cashier/
│   ├── 📄 Admin/
│   └── 📄 Manager/
├── 📁 Prototypes/
│   ├── 📄 User Flows/
│   └── 📄 Interactive Demos/
└── 📄 README.md
```

#### **Étape 3 : Partager le Projet**
1. Cliquer sur **"Share"** en haut à droite
2. Ajouter tous les membres de l'équipe avec les permissions :
   - **Frontend Lead** : Can Edit
   - **Frontend Dev** : Can Edit
   - **IA Agent** : Can View
   - **QA/DevOps** : Can View
   - **Backend Lead** : Can View
   - **Superviseur** : Can Edit

---

### **2.2 Configuration des Styles Globaux**

#### **Couleurs (Colors)**
Créer une **Color Palette** dans Figma avec toutes les couleurs du Design System :

| Nom | Valeur Hex | Utilisation | Style Figma |
|-----|------------|-------------|-------------|
| Primary/500 | #3b82f6 | Boutons principaux | Primary Color |
| Primary/600 | #2563eb | Boutons (hover) | Primary Color |
| Primary/700 | #1d4ed8 | Boutons (active) | Primary Color |
| Secondary/500 | #64748b | Textes secondaires | Secondary Color |
| Secondary/600 | #475569 | Textes (hover) | Secondary Color |
| Success/500 | #22c55e | Succès | Success Color |
| Success/600 | #16a34a | Succès (hover) | Success Color |
| Warning/500 | #f59e0b | Avertissements | Warning Color |
| Warning/600 | #d97706 | Avertissements (hover) | Warning Color |
| Danger/500 | #ef4444 | Erreurs | Danger Color |
| Danger/600 | #dc2626 | Erreurs (hover) | Danger Color |
| Gray/50 | #f9fafb | Arrière-plan clair | Neutral Color |
| Gray/100 | #f3f4f6 | Arrière-plan cartes | Neutral Color |
| Gray/200 | #e5e7eb | Bordures | Neutral Color |
| Gray/300 | #d1d5db | Bordures (hover) | Neutral Color |
| Gray/400 | #9ca3af | Textes tertiaires | Neutral Color |
| Gray/500 | #6b7280 | Textes secondaires | Neutral Color |
| Gray/600 | #4b5563 | Textes principaux | Neutral Color |
| Gray/700 | #374151 | Textes importants | Neutral Color |
| Gray/800 | #1f2937 | Textes très importants | Neutral Color |
| Gray/900 | #111827 | Textes (noir) | Neutral Color |

**Comment créer les styles de couleur dans Figma :**
1. Sélectionner un élément avec la couleur souhaitée
2. Dans le panneau **"Styles"** (à droite), cliquer sur **+** à côté de **"Color styles"**
3. Nommer le style (ex: **Primary/500**)
4. Répéter pour toutes les couleurs

---

#### **Typography (Text Styles)**
Créer des **Text Styles** pour chaque niveau de typographie :

| Nom | Classe Tailwind | Taille | Poids | Famille | Style Figma |
|-----|-----------------|--------|-------|---------|-------------|
| Display | text-4xl | 36px | 700 | Inter | Display |
| H1 | text-3xl | 30px | 700 | Inter | Heading 1 |
| H2 | text-2xl | 24px | 600 | Inter | Heading 2 |
| H3 | text-xl | 20px | 600 | Inter | Heading 3 |
| H4 | text-lg | 18px | 600 | Inter | Heading 4 |
| Body | text-base | 16px | 400 | Inter | Body |
| Small | text-sm | 14px | 400 | Inter | Small |
| X-Small | text-xs | 12px | 400 | Inter | X-Small |

**Comment créer les styles de texte dans Figma :**
1. Créer un cadre de texte avec le style souhaité
2. Dans le panneau **"Styles"**, cliquer sur **+** à côté de **"Text styles"**
3. Nommer le style (ex: **H1**)
4. Configurer la famille (Inter), taille, poids, etc.
5. Répéter pour tous les styles

---

#### **Effets (Effects)**
Créer des **Effect Styles** pour les ombres et autres effets :

| Nom | Valeur | Style Figma |
|-----|--------|-------------|
| Shadow/Small | 0 1px 2px 0 rgb(0 0 0 / 0.05) | Shadow Small |
| Shadow/Medium | 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1) | Shadow Medium |
| Shadow/Large | 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1) | Shadow Large |
| Shadow/XL | 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1) | Shadow XL |

---

### **2.3 Configuration des Grilles (Grids)**

#### **Grid System**
Configurer un système de grille cohérent pour le responsive design :

| Breakpoint | Largeur | Gutter | Colonnes |
|------------|---------|--------|----------|
| Mobile | 320px - 639px | 16px | 4 |
| Tablet | 640px - 1023px | 24px | 8 |
| Desktop | 1024px - 1279px | 32px | 12 |
| Large Desktop | 1280px+ | 32px | 12 |

**Comment configurer les grilles dans Figma :**
1. Sélectionner un frame
2. Cliquer sur **"Layout Grid"** dans le panneau de droite
3. Choisir **"Grid"** ou **"Columns"**
4. Configurer le nombre de colonnes, gutter, marges

---

## **3. CRÉATION DU DESIGN SYSTEM**

### **3.1 Structure du Design System**

```
Design System/
├── 📁 Foundations/
│   ├── 📄 Colors
│   ├── 📄 Typography
│   ├── 📄 Spacing
│   ├── 📄 Shadows
│   └── 📄 Borders
├── 📁 Components/
│   ├── 📁 Atoms/
│   │   ├── 📄 Button/
│   │   │   ├── 📄 Primary
│   │   │   ├── 📄 Secondary
│   │   │   ├── 📄 Danger
│   │   │   └── 📄 ...
│   │   ├── 📄 Input/
│   │   ├── 📄 Select/
│   │   ├── 📄 Badge/
│   │   └── 📄 ...
│   ├── 📁 Molecules/
│   │   ├── 📄 SearchBar/
│   │   ├── 📄 DataTable/
│   │   ├── 📄 FormField/
│   │   └── 📄 ...
│   └── 📁 Organisms/
│       ├── 📄 Sidebar/
│       ├── 📄 Header/
│       ├── 📄 Card/
│       └── 📄 ...
├── 📁 Patterns/
│   ├── 📄 Forms/
│   ├── 📄 Tables/
│   └── 📄 Modals/
└── 📁 Templates/
    ├── 📄 Page Template/
    ├── 📄 Form Template/
    └── 📄 Dashboard Template/
```

---

### **3.2 Composants Atomiques (Atoms)**

#### **Button**
**Variantes :**
- Primary (bleu)
- Secondary (gris)
- Success (vert)
- Warning (orange)
- Danger (rouge)
- Ghost (transparent)
- Link (lien)

**Tailles :**
- Small (sm) - 32px
- Medium (md) - 40px
- Large (lg) - 48px

**États :**
- Default
- Hover
- Active
- Disabled
- Loading

**Propriétés dans Figma :**
```
Frame: Button
├── Auto Layout: Horizontal
├── Padding: 12px 24px (md), 8px 16px (sm), 16px 32px (lg)
├── Border Radius: 8px
├── Fill: Primary/500 (default), Primary/600 (hover), Primary/700 (active)
├── Text: Body, White
└── Icon: Optionnel (16px, à gauche ou à droite)
```

**Code généré (Tailwind) :**
```jsx
<button className="px-6 py-3 bg-primary-600 text-white rounded-lg 
                        hover:bg-primary-700 active:bg-primary-800 
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors duration-200">
  Button Text
</button>
```

---

#### **Input**
**Variantes :**
- Text
- Number
- Password
- Search
- Date
- Email

**Tailles :**
- Small (sm) - 32px
- Medium (md) - 40px
- Large (lg) - 48px

**États :**
- Default
- Focus
- Error
- Disabled
- Readonly

**Propriétés dans Figma :**
```
Frame: Input
├── Auto Layout: Horizontal
├── Padding: 12px 16px (md)
├── Border: 1px Solid Gray/300
├── Border Radius: 8px
├── Fill: White
├── Text: Body, Gray/900
├── Placeholder: Small, Gray/400
└── Icon: Optionnel (recherche, erreur, succès)
```

**Code généré (Tailwind) :**
```jsx
<input className="w-full px-4 py-3 border border-gray-300 rounded-lg 
                       focus:border-primary-500 focus:ring-2 focus:ring-primary-200 
                       disabled:bg-gray-100 disabled:cursor-not-allowed
                       placeholder:text-gray-400
                       transition-all duration-200" 
       placeholder="Enter text..." />
```

---

#### **Select**
**Variantes :**
- Single
- Multiple
- With Search

**États :**
- Default
- Open
- Focus
- Error
- Disabled

---

#### **Card**
**Variantes :**
- Default
- Hoverable
- Interactive
- With Header
- With Footer

**Propriétés dans Figma :**
```
Frame: Card
├── Auto Layout: Vertical
├── Padding: 24px
├── Border: 1px Solid Gray/200
├── Border Radius: 12px
├── Fill: White
├── Shadow: Shadow/Small
└── Children: Header (optionnel), Content, Footer (optionnel)
```

**Code généré (Tailwind) :**
```jsx
<div className="bg-white border border-gray-200 rounded-xl p-6 
            shadow-sm hover:shadow-md transition-shadow duration-200">
  {/* Header */}
  <div className="mb-4">...</div>
  
  {/* Content */}
  <div>...</div>
  
  {/* Footer */}
  <div className="mt-4 pt-4 border-t border-gray-200">...</div>
</div>
```

---

### **3.3 Composants Moléculaires (Molecules)**

#### **SearchBar**
**Composants enfants :**
- Input (Search)
- Button (Search)
- Button (Clear)

**Propriétés dans Figma :**
```
Frame: SearchBar
├── Auto Layout: Horizontal
├── Padding: 0
├── Gap: 8px
├── Background: White
├── Border: 1px Solid Gray/300
├── Border Radius: 8px
├── Input: Flexible
└── Buttons: Fixed (40px)
```

---

#### **DataTable**
**Composants enfants :**
- Table Header
- Table Body
- Table Footer (Pagination)
- Sort Icons
- Filter Inputs

**Propriétés dans Figma :**
```
Frame: DataTable
├── Auto Layout: Vertical
├── Padding: 0
├── Background: White
├── Border: 1px Solid Gray/200
├── Border Radius: 8px
├── Header: Background Gray/50, Text Small Bold
├── Body: Text Body
├── Row: Hover Background Gray/50
└── Footer: Pagination
```

---

### **3.4 Composants Organiques (Organisms)**

#### **Sidebar**
**Composants enfants :**
- Logo
- Navigation Items
- User Profile
- Settings

**Propriétés dans Figma :**
```
Frame: Sidebar
├── Width: 256px (collapsed: 64px)
├── Height: 100vh
├── Background: White
├── Border Right: 1px Solid Gray/200
├── Padding: 16px
├── Navigation: Auto Layout Vertical, Gap 8px
└── Items: Icon + Text, Hover Background Gray/100
```

---

#### **Header**
**Composants enfants :**
- Logo/Brand
- SearchBar
- Notifications
- User Menu

**Propriétés dans Figma :**
```
Frame: Header
├── Height: 64px
├── Background: White
├── Border Bottom: 1px Solid Gray/200
├── Padding: 16px 24px
├── Auto Layout: Horizontal
├── Gap: 16px
└── Items: Alignement à gauche et à droite
```

---

## **4. PROTOTYPAGE INTERACTIF**

### **4.1 Création des Flux Utilisateurs**

#### **Flux Principaux**
1. **Authentification**
   - Login → Dashboard
   - Logout → Login

2. **Gestion des Produits**
   - Dashboard → Products → Product List
   - Product List → Product Form (New/Edit)
   - Product Form → Product List (Save/Cancel)

3. **Vente**
   - Dashboard → Sales → Sales List
   - Sales List → Sale Form (New)
   - Sale Form → Payment → Receipt

4. **Caisse**
   - Dashboard → Cashier
   - Cashier → Scan Barcode → Add to Cart
   - Cart → Payment → Receipt

5. **Administration**
   - Dashboard → Admin → Users/Roles/Permissions
   - Users → User Form (New/Edit)

---

### **4.2 Configuration des Interactions**

**Comment créer des prototypes interactifs dans Figma :**
1. Sélectionner un élément (ex: bouton)
2. Cliquer sur **"Prototype"** en haut à droite
3. Cliquer sur **+** à côté de l'élément
4. Choisir le type d'interaction :
   - **On Click**
   - **On Hover**
   - **On Press**
5. Définir l'action :
   - **Navigate To** (pour la navigation)
   - **Overlay** (pour les modales)
   - **Scroll To** (pour le défilement)
6. Configurer la destination (frame cible)
7. Ajouter des animations si nécessaire

---

### **4.3 Exemple : Flux de Vente**

```
1. Dashboard
   ├── On Click "Nouvelle Vente" → Navigate To: SaleForm
   
2. SaleForm
   ├── On Click "Scanner Barcode" → Overlay: BarcodeScanner
   ├── On Click "Ajouter Produit" → Navigate To: ProductSearch
   ├── On Click "Valider" → Navigate To: Payment
   
3. BarcodeScanner (Overlay)
   ├── On Click "Fermer" → Close Overlay
   ├── On Barcode Scan → Add to Cart (Auto)
   
4. ProductSearch
   ├── On Click Product → Add to Cart
   ├── On Click "Annuler" → Navigate To: SaleForm
   
5. Payment
   ├── On Click "Payer" → Navigate To: Receipt
   ├── On Click "Annuler" → Navigate To: SaleForm
   
6. Receipt
   ├── On Click "Imprimer" → Print
   ├── On Click "Nouvelle Vente" → Navigate To: SaleForm
   ├── On Click "Dashboard" → Navigate To: Dashboard
```

---

## **5. HANDOFF AUX DÉVELOPPEURS**

### **5.1 Préparation pour le Handoff**

**Checklist avant handoff :**
- [ ] Tous les composants sont créés et nommés
- [ ] Tous les styles (couleurs, typographie, etc.) sont définis
- [ ] Tous les prototypes sont fonctionnels
- [ ] Toutes les mesures sont précises
- [ ] Les spécifications sont documentées
- [ ] Les assets (icônes, images) sont exportés

---

### **5.2 Utilisation des Fonctionnalités de Handoff de Figma**

#### **Mode Développeur (Dev Mode)**
1. Cliquer sur **"Dev Mode"** en haut à droite
2. Sélectionner un élément pour voir :
   - **CSS** : Code CSS généré
   - **Properties** : Toutes les propriétés (couleurs, typographie, etc.)
   - **Assets** : Images et icônes à exporter
   - **Measurements** : Distances et dimensions

#### **Inspection du Code**
Pour chaque élément, Figma génère automatiquement :
- **CSS** : Styles CSS
- **Swift** : Code pour iOS
- **Android XML** : Code pour Android
- **React** : Code React (via plugins)

**Exemple pour un bouton :**
```css
/* CSS généré par Figma */
.button {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  gap: 8px;
  
  width: fit-content;
  height: 40px;
  
  background: #3b82f6;
  border-radius: 8px;
  
  font-family: 'Inter', sans-serif;
  font-style: normal;
  font-weight: 500;
  font-size: 16px;
  line-height: 24px;
  color: #ffffff;
  
  cursor: pointer;
}

.button:hover {
  background: #2563eb;
}

.button:active {
  background: #1d4ed8;
}
```

---

### **5.3 Plugins Recommandés pour le Handoff**

| Plugin | Description | Lien |
|--------|-------------|------|
| **Figma to Code** | Génère du code React, Vue, Angular | [Lien](https://www.figma.com/community/plugin/747980299425933893/Figma-to-Code) |
| **Anima** | Export vers React, Vue, HTML/CSS | [Lien](https://www.figma.com/community/plugin/744979338625977523/Anima) |
| **Storybook for Figma** | Synchronisation avec Storybook | [Lien](https://www.figma.com/community/plugin/752471379187538854/Storybook-for-Figma) |
| **Tailwind CSS for Figma** | Génère du code Tailwind | [Lien](https://www.figma.com/community/plugin/745784132247621342/Tailwind-CSS-for-Figma) |
| **Figma to React** | Export direct vers React | [Lien](https://www.figma.com/community/plugin/745784132247621342/Figma-to-React) |
| **Design Tokens** | Génère des design tokens | [Lien](https://www.figma.com/community/plugin/746304199006721893/Design-Tokens) |

---

### **5.4 Export des Assets**

**Comment exporter les assets :**
1. Sélectionner l'élément ou le frame à exporter
2. Cliquer sur **"Export"** dans le panneau de droite
3. Choisir le format :
   - **PNG** : Pour les images
   - **SVG** : Pour les icônes et logos
   - **JPG** : Pour les photos
4. Configurer la taille (1x, 2x, 3x, 4x)
5. Cliquer sur **"Export"**

**Bonnes pratiques :**
- Exporter les icônes en **SVG** (vectoriel, scalable)
- Exporter les images en **PNG** (transparence) ou **WebP** (optimisé)
- Utiliser des noms de fichiers clairs (ex: `button-primary.svg`)
- Organiser les exports dans des dossiers :
  ```
  assets/
  ├── icons/
  │   ├── arrow-left.svg
  │   ├── search.svg
  │   └── ...
  ├── images/
  │   ├── logo.png
  │   └── ...
  └── illustrations/
      ├── empty-state.svg
      └── ...
  ```

---

## **6. INTÉGRATION AVEC LE CODE**

### **6.1 Synchronisation avec Storybook**

**Configuration :**
1. Installer le plugin **Storybook for Figma**
2. Connecter Storybook à Figma
3. Synchroniser les composants

**Avantages :**
- Documentation automatique des composants
- Exemples interactifs
- Synchronisation bidirectionnelle

---

### **6.2 Génération de Design Tokens**

**Design Tokens** sont des variables qui représentent les valeurs de design (couleurs, typographie, etc.) et peuvent être utilisées dans le code.

**Exemple de design tokens (JSON) :**
```json
{
  "color": {
    "primary": {
      "500": "#3b82f6",
      "600": "#2563eb",
      "700": "#1d4ed8"
    },
    "secondary": {
      "500": "#64748b",
      "600": "#475569"
    },
    "success": {
      "500": "#22c55e",
      "600": "#16a34a"
    },
    "gray": {
      "50": "#f9fafb",
      "100": "#f3f4f6",
      "200": "#e5e7eb",
      "300": "#d1d5db",
      "400": "#9ca3af",
      "500": "#6b7280",
      "600": "#4b5563",
      "700": "#374151",
      "800": "#1f2937",
      "900": "#111827"
    }
  },
  "typography": {
    "fontFamily": "Inter, system-ui, -apple-system, sans-serif",
    "fontSize": {
      "display": "36px",
      "h1": "30px",
      "h2": "24px",
      "h3": "20px",
      "h4": "18px",
      "body": "16px",
      "small": "14px",
      "xs": "12px"
    },
    "fontWeight": {
      "normal": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700
    }
  },
  "spacing": {
    "0": "0px",
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px"
  },
  "shadow": {
    "small": "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    "medium": "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    "large": "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    "xl": "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)"
  }
}
```

**Utilisation dans Tailwind :**
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
        // ... autres couleurs
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      fontSize: {
        display: '36px',
        h1: '30px',
        // ... autres tailles
      },
    },
  },
}
```

---

### **6.3 Workflow de Développement**

#### **Étape 1 : Récupérer les Spécifications**
1. Ouvrir Figma et naviguer vers le composant/page
2. Activer le **Dev Mode**
3. Vérifier les propriétés, mesures et styles
4. Exporter les assets nécessaires

#### **Étape 2 : Implémenter le Composant**
1. Créer un nouveau fichier dans `/frontend/src/components/ui/[ComponentName]/`
2. Implémenter le composant en utilisant :
   - Les styles de Tailwind (basés sur les design tokens)
   - Les props nécessaires
   - Les états (default, hover, active, disabled, etc.)
3. Ajouter la documentation JSDoc

#### **Étape 3 : Documenter dans Storybook**
1. Créer un fichier `ComponentName.stories.jsx`
2. Ajouter des exemples d'utilisation
3. Documenter les props et leurs types
4. Ajouter des contrôles pour les props

#### **Étape 4 : Tester le Composant**
1. Écrire des tests unitaires avec Jest
2. Tester les états et interactions
3. Vérifier la responsivité
4. Vérifier l'accessibilité

#### **Étape 5 : Revue de Code**
1. Créer une Pull Request
2. Demander une revue à l'équipe
3. Corriger les commentaires
4. Merge après validation

---

## **7. BONNES PRATIQUES**

### **7.1 Organisation des Fichiers Figma**

✅ **À faire :**
- Utiliser des **frames** pour chaque composant
- Nommer clairement tous les éléments
- Utiliser des **auto layouts** pour les composants flexibles
- Créer des **variants** pour les différents états
- Organiser les pages par fonctionnalité
- Utiliser des **styles globaux** pour la cohérence

❌ **À éviter :**
- Créer des composants sans nom
- Dupliquer des styles similaires
- Utiliser des valeurs fixes au lieu de styles globaux
- Ne pas documenter les spécifications
- Laisser des éléments non organisés

---

### **7.2 Collaboration Efficace**

✅ **À faire :**
- **Communiquer** régulièrement avec l'équipe
- **Commenter** dans Figma pour donner du feedback
- **Valider** les designs avant de commencer le développement
- **Documenter** les décisions de design
- **Respecter** les conventions de nommage

❌ **À éviter :**
- Travailler en silo sans communication
- Modifier des composants sans prévenir
- Ignorer les commentaires de l'équipe
- Développer sans design validé
- Utiliser des noms incohérents

---

### **7.3 Nommage des Éléments**

**Conventions de nommage :**
- **Composants** : `Button/Primary`, `Input/Text`, `Card/Default`
- **Pages** : `Login`, `Dashboard`, `Products/List`
- **Frames** : `Header`, `Sidebar`, `Modal/Confirm`
- **Styles** : `Primary/500`, `H1`, `Shadow/Medium`
- **Assets** : `icon-search`, `logo-primary`, `illustration-empty`

**Exemples :**
- ✅ `Button/Primary` (bon)
- ❌ `Bouton Bleu` (mauvais - pas de hiérarchie)
- ✅ `Input/Text` (bon)
- ❌ `Champ Texte` (mauvais - pas de hiérarchie)

---

## **8. RÉSOLUTION DES PROBLÈMES**

### **8.1 Problèmes Courants et Solutions**

| Problème | Cause | Solution |
|----------|-------|----------|
| **Les styles ne sont pas synchronisés** | Styles locaux au lieu de globaux | Utiliser les styles globaux définis dans Figma |
| **Les composants ne sont pas réutilisables** | Pas de variants ou auto layouts | Créer des variants et utiliser auto layouts |
| **Les mesures sont incorrectes** | Unités différentes (px, rem, %) | Utiliser toujours les mêmes unités (px pour Figma, rem pour le code) |
| **Les couleurs ne correspondent pas** | Valeurs hex différentes | Vérifier les valeurs dans le Design System |
| **Le prototype ne fonctionne pas** | Interactions mal configurées | Vérifier les destinations et les déclencheurs |
| **Le code généré n'est pas optimal** | Plugin de génération basique | Utiliser des plugins avancés ou générer manuellement |

---

### **8.2 FAQ (Foire Aux Questions)**

**Q : Comment partager un composant entre plusieurs pages ?**
A : Créer le composant dans la bibliothèque **Design System**, puis l'utiliser via **Assets > Team Library**.

**Q : Comment créer un composant avec plusieurs variantes ?**
A : Sélectionner tous les états du composant, puis cliquer sur **+** à côté de **"Variants"** dans le panneau des propriétés.

**Q : Comment exporter un composant en SVG ?**
A : Sélectionner le composant, cliquer sur **"Export"**, choisir **SVG**, puis **"Export"**.

**Q : Comment synchroniser Figma avec Storybook ?**
A : Installer le plugin **Storybook for Figma**, connecter les deux outils, et synchroniser les composants.

**Q : Comment générer du code Tailwind depuis Figma ?**
A : Installer le plugin **Tailwind CSS for Figma**, sélectionner un élément, et utiliser le plugin pour générer le code.

**Q : Comment vérifier l'accessibilité dans Figma ?**
A : Utiliser le plugin **A11y - Accessibility Checker** pour vérifier le contraste, la taille du texte, etc.

---

## **9. RESSOURCES ET LIENS**

### **9.1 Ressources Figma**

| Ressource | Lien | Description |
|-----------|------|-------------|
| **Figma Community** | [community.figma.com](https://community.figma.com) | Plugins, templates, ressources |
| **Figma Help Center** | [help.figma.com](https://help.figma.com) | Documentation officielle |
| **Figma Design Systems** | [figma.com/design-systems](https://www.figma.com/design-systems/) | Guides et bonnes pratiques |
| **Figma for Developers** | [figma.com/developers](https://www.figma.com/developers) | API, plugins, handoff |
| **Figma YouTube** | [youtube.com/figma](https://www.youtube.com/c/FigmaDesign) | Tutoriels vidéo |

---

### **9.2 Templates et Kits de Démarrage**

| Template | Lien | Description |
|----------|------|-------------|
| **Tailwind UI Kit** | [Lien](https://www.figma.com/community/file/1025261399339556401/Tailwind-CSS-UI-Kit) | Kit UI basé sur Tailwind |
| **Material Design Kit** | [Lien](https://www.figma.com/community/file/867829551237755926/Material-Design-UI-Kit) | Kit Material Design |
| **Admin Dashboard** | [Lien](https://www.figma.com/community/file/888725255979113525/Admin-Dashboard) | Template de dashboard |
| **E-commerce UI** | [Lien](https://www.figma.com/community/file/888725255979113524/E-commerce-UI-Kit) | Kit pour e-commerce |

---

### **9.3 Outils Complémentaires**

| Outil | Lien | Description |
|-------|------|-------------|
| **Storybook** | [storybook.js.org](https://storybook.js.org) | Documentation des composants |
| **Zeroheight** | [zeroheight.com](https://zeroheight.com) | Documentation de design system |
| **Zeplin** | [zeplin.io](https://zeplin.io) | Alternative à Figma pour le handoff |
| **Avocode** | [avocode.com](https://avocode.com) | Handoff et export de code |
| **Lona** | [lona.studio](https://lona.studio) | Design to Code pour React Native |

---

## **10. CHECKLIST DE VALIDATION**

### **10.1 Avant de Commencer un Nouveau Composant**
- [ ] Le composant est défini dans le Design System Figma
- [ ] Tous les états sont conçus (default, hover, active, disabled, etc.)
- [ ] Les styles globaux sont utilisés (couleurs, typographie, etc.)
- [ ] Le composant est validé par le Frontend Lead
- [ ] Les spécifications sont documentées dans Figma

### **10.2 Après avoir Implémenté un Composant**
- [ ] Le code correspond au design Figma
- [ ] Tous les états sont implémentés
- [ ] Le composant est responsive
- [ ] Le composant est accessible (WCAG 2.1 AA)
- [ ] Les tests unitaires sont écrits
- [ ] La documentation Storybook est complète
- [ ] La revue de code est demandée

### **10.3 Avant la Livraison**
- [ ] Tous les composants sont implémentés
- [ ] Tous les tests passent
- [ ] L'accessibilité est validée
- [ ] Les performances sont optimales
- [ ] La documentation est complète
- [ ] Le handoff avec Figma est synchronisé

---

## **11. CONCLUSION**

Figma est un outil **puissant** pour la refonte du frontend de Pharma 360°. En suivant ce guide, l'équipe pourra :

✅ **Collaborer efficacement** entre designers et développeurs
✅ **Créer un Design System cohérent** et réutilisable
✅ **Prototyper les flux utilisateurs** avant le développement
✅ **Faciliter le handoff** avec du code généré automatiquement
✅ **Maintenir la cohérence** entre le design et le code

**Prochaines étapes :**
1. Créer le projet Figma et configurer les styles globaux
2. Implémenter le Design System dans Figma
3. Prototyper les flux principaux
4. Commencer le handoff avec les développeurs

---

**📅 Date de création :** 2024-11-06  
**👤 Auteur :** Équipe Pharma 360° Synchronisée  
**🔄 Version :** 1.0  
**📝 Statut :** ✅ Approuvé - Prêt pour exécution

---

*"Un bon design commence par une bonne collaboration."* 🎨
