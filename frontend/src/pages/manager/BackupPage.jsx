import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Database, ChevronLeft, Download, Clock, Trash2, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card'
import { Button } from '../../components/ui/Button'
import { useToast } from '../../components/common/Toast'
import api from '../../services/api'
import { formatDate, formatDateTime } from '../../lib/utils'

/**
 * Backup Page
 * Database backup management
 * 
 * FRNT-004: Administration système
 */
function BackupPage() {
  const { addToast } = useToast()
  const [backups, setBackups] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    fetchBackups()
  }, [])

  const fetchBackups = async () => {
    try {
      setIsLoading(true)
      const response = await api.get('/manager/backups')
      setBackups(response.data.backups || [])
    } catch (error) {
      console.error('Failed to fetch backups:', error)
      addToast({ type: 'error', title: 'Erreur', message: 'Échec du chargement des sauvegardes' })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateBackup = async () => {
    try {
      setIsCreating(true)
      const response = await api.post('/manager/backups/create')
      addToast({ type: 'success', title: 'Succès', message: 'Sauvegarde créée avec succès' })
      fetchBackups()
    } catch (error) {
      const message = error.response?.data?.message || 'Échec de la création de la sauvegarde'
      addToast({ type: 'error', title: 'Erreur', message })
    } finally {
      setIsCreating(false)
    }
  }

  const handleDownloadBackup = async (backupId, filename) => {
    try {
      const response = await api.get(`/manager/backups/${backupId}/download`, {
        responseType: 'blob'
      })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      
      addToast({ type: 'success', title: 'Succès', message: 'Téléchargement démarré' })
    } catch (error) {
      const message = error.response?.data?.message || 'Échec du téléchargement'
      addToast({ type: 'error', title: 'Erreur', message })
    }
  }

  const handleDeleteBackup = async (backupId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette sauvegarde ?')) return
    
    try {
      setIsDeleting(true)
      await api.delete(`/manager/backups/${backupId}`)
      addToast({ type: 'success', title: 'Succès', message: 'Sauvegarde supprimée' })
      fetchBackups()
    } catch (error) {
      const message = error.response?.data?.message || 'Échec de la suppression'
      addToast({ type: 'error', title: 'Erreur', message })
    } finally {
      setIsDeleting(false)
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'failed':
        return <XCircle className="w-4 h-4 text-red-500" />
      case 'in_progress':
        return <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
      default:
        return <AlertCircle className="w-4 h-4 text-yellow-500" />
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Terminée'
      case 'failed':
        return 'Échouée'
      case 'in_progress':
        return 'En cours'
      default:
        return status
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link to="/manager" className="hover:text-primary-600 dark:hover:text-primary-400">
              Gestionnaire
            </Link>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-gray-900 dark:text-white">
              Sauvegardes
            </span>
          </nav>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-6 h-6" />
              Gestion des sauvegardes
            </CardTitle>
            <CardDescription>
              Créez, téléchargez et gérez les sauvegardes de votre base de données
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Create Backup */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Sauvegardes existantes
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Liste des sauvegardes disponibles
                </p>
              </div>
              <Button onClick={handleCreateBackup} disabled={isCreating}>
                <Database className="w-4 h-4 mr-2" />
                {isCreating ? 'Création en cours...' : 'Créer une sauvegarde'}
              </Button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            ) : backups.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  Aucune sauvegarde disponible
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Créez votre première sauvegarde en cliquant sur le bouton ci-dessus
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {backups.map(backup => (
                  <Card key={backup.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                          <Database className="w-6 h-6 text-primary-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900 dark:text-white">
                            Sauvegarde #{backup.id}
                          </h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {formatDateTime(backup.created_at)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(backup.status)}
                          <span className="text-sm text-gray-600 dark:text-gray-400">
                            {getStatusText(backup.status)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDownloadBackup(backup.id, backup.filename)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteBackup(backup.id)}
                            disabled={isDeleting}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">
                          Taille: {backup.size ? (backup.size / 1024 / 1024).toFixed(2) + ' MB' : 'N/A'}
                        </span>
                        <span className="text-gray-600 dark:text-gray-400">
                          Durée: {backup.duration ? backup.duration + 's' : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
          
          <CardFooter>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              <AlertCircle className="w-4 h-4 inline mr-2" />
              Les sauvegardes sont conservées pendant 30 jours avant suppression automatique
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

export default BackupPage
