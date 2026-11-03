import React from 'react'
import { Link } from 'react-router-dom'
import { ShoppingCart, CreditCard, Package, Users, Barcode, Bell } from 'lucide-react'

/**
 * Page d'aide - Pharma 360
 * Présente les rôles et les parcours principaux de l'application.
 */
const ROLES = [
  { name: 'Vendeur (seller)', icon: ShoppingCart, text: 'Recherche les produits, prépare la vente et l’envoie à la caisse.' },
  { name: 'Caissier (cashier)', icon: CreditCard, text: 'Gère la file d’attente et valide les paiements.' },
  { name: 'Gestionnaire (manager)', icon: Package, text: 'Gère les stocks, les fournisseurs, les retours et les rapports.' },
  { name: 'Administrateur (admin)', icon: Users, text: 'Accès complet : utilisateurs, rôles et paramètres.' },
]

const TOPICS = [
  {
    icon: ShoppingCart,
    title: 'Faire une vente',
    steps: [
      'Ouvrez « Ventes » et cherchez un médicament par nom, DCI ou code-barres.',
      'Ajoutez-le au panier : le lot qui expire en premier est proposé (principe FEFO).',
      'Envoyez la vente à la caisse.',
    ],
  },
  {
    icon: CreditCard,
    title: 'Encaisser',
    steps: [
      'Ouvrez « Caisse » : les ventes envoyées apparaissent dans la file d’attente.',
      'Sélectionnez la vente, encaissez, puis validez le paiement.',
    ],
  },
  {
    icon: Barcode,
    title: 'Scanner un code-barres',
    steps: [
      'Utilisez le bouton « Scanner » sur la page Produits ou Ventes.',
      'Le produit correspondant est sélectionné automatiquement s’il existe.',
    ],
  },
  {
    icon: Bell,
    title: 'Alertes',
    steps: [
      'Les alertes de péremption proche et de rupture de stock sont signalées dans l’application.',
    ],
  },
]

function HelpPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Aide</h1>
        <p className="text-gray-500 mt-1">Les parcours principaux de Pharma 360</p>
      </div>

      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Rôles</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROLES.map(({ name, icon: Icon, text }) => (
            <div key={name} className="flex gap-3">
              <Icon className="w-5 h-5 text-primary-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium text-gray-900">{name}</p>
                <p className="text-sm text-gray-500">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {TOPICS.map(({ icon: Icon, title, steps }) => (
          <div key={title} className="card">
            <div className="flex items-center gap-2 mb-3">
              <Icon className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            </div>
            <ol className="list-decimal pl-5 space-y-1 text-sm text-gray-600">
              {steps.map((s) => <li key={s}>{s}</li>)}
            </ol>
          </div>
        ))}
      </div>

      <p className="text-sm text-gray-500">
        Un problème ? Contactez votre administrateur ou retournez au <Link to="/" className="text-primary-600 hover:underline">tableau de bord</Link>.
      </p>
    </div>
  )
}

export default HelpPage
