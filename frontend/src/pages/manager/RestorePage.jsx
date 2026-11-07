import React, { useState, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Upload, ChevronLeft, Database, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card.jsx'
import { Button } from '@/components/ui/button.jsx'
import { Input } from '@/components/ui/input.jsx'
import { useToast } from '@/components/common/Toast'
import api from '@/lib/api'

/**
 * Restore Page
 * Database restore from backup files
 * 
 * FRNT-004: Administration système
 */
function RestorePage() {
  const navigate = useNavigate()
  const { addToast } = useToast()
  const [file, setFile] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [progress, setProgress] = useState(0)
  const [restoreStatus, setRestoreStatus] = useState(null)
  const fileInputRef = useRef(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      // Validate file extension
      const validExtensions = ['.sql', '.backup', '.db']
      const fileExtension = selectedFile.name.slice(selectedFile.name.lastIndexOf('.')).toLowerCase()
      
      if (validExtensions.includes(fileExtension)) {
        setFile(selectedFile)
      } else {
        addToast({ 
          type: 'error', 
          title: 'Erreur', 
          message: 'Type de fichier non valide. Veuillez sélectionner un fichier .sql, .backup ou .db' 
        })
        e.target.value = ''
      }
    }
  }

  const handleUpload = async () => {
    if (!file) {
      addToast({ type: 'error', title: 'Erreur', message: 'Veuillez sélectionner un fichier' })
      return
    }

    try {
      setIsUploading(true)
      setProgress(0)
      setRestoreStatus(null)
      
      const formData = new FormData()
      formData.append('backup', file)
      
      const response = await api.post('/manager/restore/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          setProgress(percentCompleted)
        }
      })
      
      setRestoreStatus({
        type: 'uploaded',
        message: 'Fichier téléchargé avec succès',
        data: response.data
      })
      
      addToast({ type: 'success', title: 'Succès', message: 'Fichier téléchargé' })
    } catch (error) {
      const message = error.response?.data?.message || 'Échec du téléchargement du fichier'
      addToast({ type: 'error', title: 'Erreur', message })
      setRestoreStatus({ type: 'error', message })
    } finally {
      setIsUploading(false)
    }
  }

  const handleRestore = async () => {
    if (!window.confirm('Êtes-vous SÛR de vouloir restaurer cette sauvegarde ? Cette action remplacera toutes vos données actuelles.')) {
      return
    }

    try {
      setIsRestoring(true)
      setProgress(0)
      
      const response = await api.post('/manager/restore/execute', {}, {
        onDownloadProgress: (progressEvent) => {
          // Simulate progress for restore operation
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 100)
          )
          setProgress(percentCompleted)
        }
      })
      
      setRestoreStatus({
        type: 'completed',
        message: 'Restauration terminée avec succès',
        data: response.data
      })
      
      addToast({ 
        type: 'success', 
        title: 'Succès', 
        message: 'Base de données restaurée avec succès. Vous serez redirigé.' 
      })
      
      // Redirect to login or dashboard after restore
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error) {
      const message = error.response?.data?.message || 'Échec de la restauration'
      addToast({ type: 'error', title: 'Erreur', message })
      setRestoreStatus({ type: 'error', message })
    } finally {
      setIsRestoring(false)
    }
  }

  const handleCancel = () => {
    setFile(null)
    setProgress(0)
    setRestoreStatus(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getStatusIcon = () => {
    if (!restoreStatus) return null
    switch (restoreStatus.type) {
      case 'uploaded':
        return <CheckCircle className="w-8 h-8 text-green-500" />
      case 'completed':
        return <CheckCircle className="w-8 h-8 text-green-500" />
      case 'error':
        return <XCircle className="w-8 h-8 text-red-500" />
      default:
        return <AlertCircle className="w-8 h-8 text-yellow-500" />
    }
  }

  const getStatusMessage = () => {
    if (!restoreStatus) return null
    return restoreStatus.message
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumbs */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <Link to="/manager" className="hover:text-primary-600 dark:hover:text-primary-400">
              Gestionnaire
            </Link>
            <ChevronLeft className="w-4 h-4" />
            <span className="text-gray-900 dark:text-white">
              Restaurer une sauvegarde
            </span>
          </nav>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-6 h-6" />
              Restaurer une sauvegarde
            </CardTitle>
            <CardDescription>
              Téléchargez et restaurez une sauvegarde de votre base de données
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Warning */}
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                    Attention !
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-300">
                    La restauration d'une sauvegarde remplacera TOUTES vos données actuelles. 
                    Assurez-vous d'avoir une sauvegarde récente avant de continuer.
                  </p>
                </div>
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Sélectionner un fichier de sauvegarde
              </h3>
              
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                <div className="mb-4">
                  <Upload className="w-12 h-12 text-gray-400 dark:text-gray-500 mx-auto" />
                </div>
                
                <Input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".sql,.backup,.db"
                  className="hidden"
                  id="file-upload"
                />
                
                <Label htmlFor="file-upload" className="cursor-pointer">
                  <Button variant="outline" asChild>
                    <span>
                      {file ? file.name : 'Cliquez pour sélectionner un fichier'}
                    </span>
                  </Button>
                </Label>
                
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  Formats supportés: .sql, .backup, .db
                </p>
                
                {file && (
                  <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                    <CheckCircle className="w-4 h-4 text-green-500 inline mr-2" />
                    Fichier sélectionné: {file.name} ({Math.round(file.size / 1024)} KB)
                  </div>
                )}
              </div>
            </div>

            {/* Progress Bar */}
            {(isUploading || isRestoring) && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">
                    {isUploading ? 'Téléchargement' : 'Restauration'}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">{progress}%</span>
                </div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-primary-600 transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Status */}
            {restoreStatus && (
              <div className={`p-4 rounded-lg ${
                restoreStatus.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' :
                'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
              }`}>
                <div className="flex items-center gap-3">
                  {getStatusIcon()}
                  <div>
                    <h4 className={`font-semibold ${
                      restoreStatus.type === 'error' ? 'text-red-800 dark:text-red-200' : 'text-green-800 dark:text-green-200'
                    }`}>
                      {restoreStatus.type === 'error' ? 'Erreur' : 'Succès'}
                    </h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {getStatusMessage()}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isUploading || isRestoring}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Annuler
            </Button>
            
            <Button
              onClick={file ? (restoreStatus?.type === 'uploaded' ? handleRestore : handleUpload) : undefined}
              disabled={!file || isUploading || isRestoring}
            >
              {isUploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Téléchargement...
                </>
              ) : isRestoring ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Restauration...
                </>
              ) : restoreStatus?.type === 'uploaded' ? (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Restaurer maintenant
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Télécharger et restaurer
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        {/* Quick Links */}
        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button variant="outline" asChild>
                  <Link to="/manager/backup">
                    <Database className="w-4 h-4 mr-2" />
                    Créer une sauvegarde
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/manager/settings">
                    <Settings className="w-4 h-4 mr-2" />
                    Paramètres
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

// Import Settings icon
import { Settings } from 'lucide-react'

export default RestorePage
