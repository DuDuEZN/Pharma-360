import React from 'react'
import { Link } from 'react-router-dom'
import { Construction } from 'lucide-react'

/**
 * Page temporaire pour les modules dont l'écran n'est pas encore développé.
 * Évite l'affichage "404 - Page non trouvée" pour des liens présents dans l'interface.
 */
function ComingSoonPage({ title = 'Module', description, backTo = '/', backLabel = "Retour à l'accueil" }) {
  return (
    <div className="card text-center py-16">
      <Construction className="w-12 h-12 mx-auto text-gray-400" />
      <h1 className="mt-4 text-2xl font-bold text-gray-900">{title}</h1>
      <p className="mt-2 text-gray-500">
        {description || "Ce module est en cours de développement et sera bientôt disponible."}
      </p>
      <Link
        to={backTo}
        className="inline-flex mt-6 px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium hover:bg-primary-700"
      >
        {backLabel}
      </Link>
    </div>
  )
}

export default ComingSoonPage
