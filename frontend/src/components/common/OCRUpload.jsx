/**
 * OCR Upload Component for Invoice Processing
 * FRNT-011: Intégration OCR (upload factures)
 */

import React, { useState, useCallback } from 'react'
import { Upload, FileText, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import { useDropzone } from 'react-dropzone'
import api from '@/lib/api'
import { useToast } from '@/components/common/Toast'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card'
import { Alert } from '@/components/ui/Alert'

const OCRUpload = ({ onSuccess, supplierId }) => {
  const [files, setFiles] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [errors, setErrors] = useState([])
  const { addToast } = useToast()

  const acceptedFileTypes = {
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'application/pdf': ['.pdf']
  }

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // Add accepted files
    const newFiles = acceptedFiles.map(file => ({
      file,
      status: 'pending',
      preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
      progress: 0
    }))
    
    setFiles(prev => [...prev, ...newFiles])
    
    // Handle rejected files
    if (rejectedFiles.length > 0) {
      const rejectedErrors = rejectedFiles.map(({ file, errors }) => ({
        file: file.name,
        errors: errors.map(e => e.message)
      }))
      setErrors(prev => [...prev, ...rejectedErrors])
    }
  }, [])

  const removeFile = (index) => {
    const fileToRemove = files[index]
    if (fileToRemove.preview) {
      URL.revokeObjectURL(fileToRemove.preview)
    }
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const processOCR = async () => {
    if (files.length === 0) {
      addToast({ type: 'error', title: 'Aucun fichier', message: 'Veuillez ajouter des fichiers à traiter' })
      return
    }

    setIsUploading(true)
    setProgress(0)
    setErrors([])

    try {
      const formData = new FormData()
      files.forEach(({ file }) => {
        formData.append('files', file)
      })
      
      if (supplierId) {
        formData.append('supplier_id', supplierId)
      }

      const response = await api.post('/ia/ocr/invoices/batch', formData, {
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          setProgress(percentCompleted)
        }
      })

      // Update file statuses
      setFiles(prev => prev.map(f => ({ ...f, status: 'completed' })))
      
      addToast({
        type: 'success',
        title: 'OCR terminé',
        message: `${files.length} facture(s) traitée(s) avec succès`
      })

      if (onSuccess) {
        onSuccess(response.data)
      }

    } catch (error) {
      addToast({
        type: 'error',
        title: 'Erreur OCR',
        message: error.response?.data?.detail || 'Erreur lors du traitement OCR'
      })
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' })))
    } finally {
      setIsUploading(false)
    }
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedFileTypes,
    maxFiles: 10,
    multiple: true
  })

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />
      case 'uploading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <FileText className="w-5 h-5 text-gray-400" />
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Traitement OCR des Factures</CardTitle>
        <CardDescription>
          Téléchargez des images ou PDF de factures pour extraction automatique des données
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div 
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive ? 'border-primary bg-primary-50' : 'border-gray-300 hover:border-primary'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="w-12 h-12 mx-auto text-primary mb-4" />
          <p className="text-lg font-semibold mb-2">
            {isDragActive ? 'Déposez les fichiers ici' : 'Glissez-déposez ou cliquez pour sélectionner'}
          </p>
          <p className="text-sm text-gray-500 mb-4">
            Formats acceptés: JPG, PNG, PDF (max 10 fichiers, 10MB chacun)
          </p>
          <Button type="button" variant="outline" disabled={isUploading}>
            Sélectionner des fichiers
          </Button>
        </div>

        {errors.length > 0 && (
          <Alert variant="error" className="mt-4">
            {errors.map((error, index) => (
              <div key={index} className="mb-1">
                <strong>{error.file}:</strong> {error.errors.join(', ')}
              </div>
            ))}
          </Alert>
        )}

        {files.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold mb-4">Fichiers à traiter ({files.length})</h3>
            <div className="space-y-3">
              {files.map((fileData, index) => (
                <div 
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    {getStatusIcon(fileData.status)}
                    <div>
                      <p className="font-medium">{fileData.file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(fileData.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    {fileData.status === 'uploading' && (
                      <div className="w-20 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-primary rounded-full"
                          style={{ width: `${fileData.progress}%` }}
                        />
                      </div>
                    )}
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => removeFile(index)}
                      disabled={isUploading}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-end">
              {isUploading ? (
                <Button disabled>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Traitement en cours... {progress}%
                </Button>
              ) : (
                <Button onClick={processOCR}>
                  <FileText className="w-4 h-4 mr-2" />
                  Traiter avec OCR
                </Button>
              )}
            </div>
          </div>
        )}

        {isUploading && progress > 0 && (
          <div className="mt-4">
            <div className="w-full h-4 bg-gray-200 rounded-full">
              <div 
                className="h-4 bg-primary rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-sm text-center mt-2">{progress}% complété</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

OCRUpload.displayName = 'OCRUpload'

export { OCRUpload }
export default OCRUpload
