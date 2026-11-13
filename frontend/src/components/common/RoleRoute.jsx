import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

/**
 * Restreint une route à une liste de rôles.
 * L'authentification est déjà vérifiée par ProtectedRoute en amont.
 */
function RoleRoute({ roles = [], children }) {
  const { user } = useAuth()

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return children
}

export default RoleRoute
