import React from 'react'
import { Link } from 'react-router-dom'
import { HelpCircle, BookOpen, MessageSquare, Phone, Mail, ChevronLeft, FileText, Settings, BarChart3 } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

function HelpPage() {
  const faqItems = [
    {
      question: "Comment ajouter un nouveau produit ?",
      answer: "Allez dans la section Produits, cliquez sur 'Nouveau produit' et remplissez le formulaire avec le code-barres, nom, catégorie, prix d'achat et prix de vente.",
      category: "Produits"
    },
    {
      question: "Comment effectuer une vente ?",
      answer: "Allez dans la section Ventes ou Caisse, scannez le code-barres du produit ou recherchez-le manuellement, ajoutez-le au panier, puis finalisez la vente en sélectionnant le mode de paiement.",
      category: "Ventes"
    },
    {
      question: "Comment gérer les stocks avec FEFO/FIFO ?",
      answer: "Le système applique automatiquement FEFO (Premier expiré, Premier sorti). Les lots sont sélectionnés en fonction de la date de péremption. Vous pouvez configurer le comportement dans les paramètres.",
      category: "Stock"
    },
    {
      question: "Comment générer un rapport ?",
      answer: "Allez dans la section Rapports (Admin ou Manager), sélectionnez le type de rapport (ventes, stocks, produits périmés) et la période souhaitée, puis cliquez sur Générer.",
      category: "Rapports"
    },
    {
      question: "Comment créer un retour client ?",
      answer: "Allez dans la section Ventes, trouvez la vente concernée, cliquez sur 'Retour' et sélectionnez les produits à retourner avec les quantités.",
      category: "Retours"
    },
    {
      question: "Comment configurer le scanner de codes-barres ?",
      answer: "Connectez votre scanner USB ou Bluetooth. Le système détecte automatiquement les entrées de scanner. Vous pouvez tester la détection dans la page Caisse.",
      category: "Matériel"
    },
  ]

  const quickLinks = [
    { name: "Documentation Technique", path: "/docs", icon: BookOpen },
    { name: "Guide Utilisateur", path: "/guide", icon: FileText },
    { name: "Paramètres Système", path: "/settings", icon: Settings },
    { name: "Tableau de bord", path: "/", icon: BarChart3 },
  ]

  const contactMethods = [
    { 
      name: "Support Technique", 
      description: "Disponible 24/7 pour les urgences",
      icon: Phone,
      contact: "+212 5 22 34 56 78"
    },
    { 
      name: "Email Support", 
      description: "Réponse sous 24h",
      icon: Mail,
      contact: "support@pharma360.ma"
    },
    { 
      name: "Chat en direct", 
      description: "Disponible pendant les heures ouvrables",
      icon: MessageSquare,
      contact: "Ouvrir le chat"
    },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/" className="flex items-center gap-2 text-primary-600 dark:text-primary-400">
              <ChevronLeft className="w-4 h-4" />
              Retour au tableau de bord
            </Link>
          </Button>
          
          <div className="mt-4">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <HelpCircle className="w-8 h-8 text-primary-600" />
              Centre d'aide Pharma 360°
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Bienvenue dans le centre d'aide. Trouvez des réponses à vos questions et contactez notre équipe si nécessaire.
            </p>
          </div>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {quickLinks.map((link) => (
            <Card key={link.path} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <link.icon className="w-8 h-8 text-primary-600" />
                <CardTitle className="mt-2 text-lg">{link.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link to={link.path}>Accéder</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* FAQ Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <BookOpen className="w-6 h-6" />
              Questions Fréquemment Posées
            </CardTitle>
            <CardDescription>
              Consultez les réponses aux questions les plus courantes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <div 
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{item.question}</h3>
                        <Badge variant="secondary" size="xs">{item.category}</Badge>
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">{item.answer}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Section */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-2">
              <MessageSquare className="w-6 h-6" />
              Contactez notre équipe
            </CardTitle>
            <CardDescription>
              Besoin d'aide supplémentaire ? Contactez-nous par l'un des moyens ci-dessous
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contactMethods.map((method, index) => (
                <div 
                  key={index}
                  className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <method.icon className="w-10 h-10 text-primary-600 mx-auto mb-3" />
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{method.name}</h4>
                  <p className="text-gray-600 dark:text-gray-300 text-sm mb-3">{method.description}</p>
                  <Badge variant="outline" className="text-sm">
                    {method.contact}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">Informations Système</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Version</span>
                <span className="font-mono text-gray-900 dark:text-white">1.0.0</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Base de données</span>
                <span className="font-mono text-gray-900 dark:text-white">PostgreSQL 14+</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Mode</span>
                <span className="font-mono text-gray-900 dark:text-white">Offline-First</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Gestion stock</span>
                <span className="font-mono text-gray-900 dark:text-white">FEFO/FIFO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">Scanner</span>
                <span className="font-mono text-gray-900 dark:text-white">Barcode intégré</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-300">WebSockets</span>
                <span className="font-mono text-gray-900 dark:text-white">Activé</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default HelpPage
