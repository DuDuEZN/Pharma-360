import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Label } from '../../components/ui/Label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/Table';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../../components/ui/Modal';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/Select';
import { Upload, FileText, Eye, Edit, Trash2, Plus, Search, Download, Camera, X, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import { useToast } from '../../components/common/Toast';
import { Badge } from '../../components/ui/Badge';
import { Separator } from '../../components/ui/Separator';
import { Skeleton } from '../../components/ui/Skeleton';
import { Alert } from '../../components/ui/Alert';
import { cn, formatCurrency, formatDate } from '../../lib/utils';
//import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card.jsx';

const SuppliersPage = () => {
  const { addToast } = useToast()
  const [suppliers, setSuppliers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);
  const [isOcrModalOpen, setIsOcrModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    email: '',
    address: '',
    phone: ''
  });
  const [invoiceFormData, setInvoiceFormData] = useState({
    supplier_id: '',
    invoice_number: '',
    date: new Date().toISOString().split('T')[0],
    total_amount: 0,
    items: []
  });

  const fileInputRef = useRef(null);

  const fetchSuppliers = async () => {
    try {
      const response = await api.get('/suppliers');
      setSuppliers(response.data || []);
    } catch (error) {
      console.error('Error fetching suppliers:', error);
      addToast({ type: 'error', title: 'Erreur', message: 'Erreur lors du chargement des fournisseurs' });
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/invoices');
      setInvoices(response.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      addToast({ type: 'error', title: 'Erreur', message: 'Erreur lors du chargement des factures' });
    }
  };

  useEffect(() => {
    fetchSuppliers();
    fetchInvoices();
  }, []);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const filteredSuppliers = suppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.contact.toLowerCase().includes(searchQuery.toLowerCase()) ||
    supplier.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!validTypes.includes(selectedFile.type)) {
        addToast({ type: 'error', title: 'Type de fichier invalide', message: 'Seuls les fichiers JPEG, PNG et PDF sont acceptés' });
        return;
      }
      
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleOcrUpload = async () => {
    if (!file) {
      addToast({ type: 'error', title: 'Aucun fichier', message: 'Veuillez sélectionner un fichier' });
      return;
    }

    try {
      setLoading(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await api.post('/invoices/ocr', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setOcrResult(response.data);
      addToast({ type: 'success', title: 'OCR Réussi', message: 'Facture analysée avec succès' });
      
      // Auto-fill invoice form if supplier is recognized
      if (response.data.supplier) {
        const supplier = suppliers.find(s => s.id === response.data.supplier.id);
        if (supplier) {
          setInvoiceFormData(prev => ({
            ...prev,
            supplier_id: supplier.id,
            invoice_number: response.data.invoice_number || '',
            date: response.data.date || new Date().toISOString().split('T')[0],
            total_amount: response.data.total_amount || 0,
            items: response.data.items || []
          }));
        }
      }
      
    } catch (error) {
      console.error('Error processing OCR:', error);
      addToast({ type: 'error', title: 'Erreur OCR', message: error.response?.data?.message || 'Erreur lors du traitement OCR' });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFile = () => {
    setFile(null);
    setPreviewUrl('');
    setOcrResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSupplierSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      addToast({ type: 'error', title: 'Champ requis', message: 'Le nom du fournisseur est obligatoire' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedSupplier) {
        await api.put(`/suppliers/${selectedSupplier.id}`, formData);
        addToast({ type: 'success', title: 'Fournisseur mis à jour', message: `${formData.name} a été mis à jour` });
      } else {
        await api.post('/suppliers', formData);
        addToast({ type: 'success', title: 'Fournisseur ajouté', message: `${formData.name} a été ajouté` });
      }
      setIsSupplierModalOpen(false);
      setFormData({ name: '', contact: '', email: '', address: '', phone: '' });
      setSelectedSupplier(null);
      fetchSuppliers();
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', message: error.response?.data?.message || 'Erreur lors de la sauvegarde' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInvoiceSubmit = async (e) => {
    e.preventDefault();
    if (!invoiceFormData.supplier_id || !invoiceFormData.invoice_number) {
      addToast({ type: 'error', title: 'Champs requis', message: 'Le fournisseur et le numéro de facture sont obligatoires' });
      return;
    }

    setIsSubmitting(true);
    try {
      if (selectedInvoice) {
        await api.put(`/invoices/${selectedInvoice.id}`, invoiceFormData);
        addToast({ type: 'success', title: 'Facture mise à jour', message: `Facture #${invoiceFormData.invoice_number} mise à jour` });
      } else {
        await api.post('/invoices', invoiceFormData);
        addToast({ type: 'success', title: 'Facture ajoutée', message: `Facture #${invoiceFormData.invoice_number} ajoutée` });
      }
      setIsInvoiceModalOpen(false);
      setInvoiceFormData({
        supplier_id: '',
        invoice_number: '',
        date: new Date().toISOString().split('T')[0],
        total_amount: 0,
        items: []
      });
      setSelectedInvoice(null);
      fetchInvoices();
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', message: error.response?.data?.message || 'Erreur lors de la sauvegarde' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSupplier = async (supplierId) => {
    try {
      await api.delete(`/suppliers/${supplierId}`);
      addToast({ type: 'success', title: 'Fournisseur supprimé', message: 'Fournisseur supprimé avec succès' });
      fetchSuppliers();
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', message: error.response?.data?.message || 'Erreur lors de la suppression' });
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    try {
      await api.delete(`/invoices/${invoiceId}`);
      addToast({ type: 'success', title: 'Facture supprimée', message: 'Facture supprimée avec succès' });
      fetchInvoices();
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', message: error.response?.data?.message || 'Erreur lors de la suppression' });
    }
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/download`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture-${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      addToast({ type: 'success', title: 'Téléchargement', message: 'Facture téléchargée' });
    } catch (error) {
      addToast({ type: 'error', title: 'Erreur', message: 'Erreur lors du téléchargement' });
    }
  };

  const openSupplierModal = (supplier = null) => {
    setSelectedSupplier(supplier);
    if (supplier) {
      setFormData({
        name: supplier.name,
        contact: supplier.contact || '',
        email: supplier.email || '',
        address: supplier.address || '',
        phone: supplier.phone || ''
      });
    } else {
      setFormData({ name: '', contact: '', email: '', address: '', phone: '' });
    }
    setIsSupplierModalOpen(true);
  };

  const openInvoiceModal = (invoice = null) => {
    setSelectedInvoice(invoice);
    if (invoice) {
      setInvoiceFormData({
        supplier_id: invoice.supplier_id,
        invoice_number: invoice.invoice_number,
        date: invoice.date,
        total_amount: invoice.total_amount,
        items: invoice.items || []
      });
    } else {
      setInvoiceFormData({
        supplier_id: '',
        invoice_number: '',
        date: new Date().toISOString().split('T')[0],
        total_amount: 0,
        items: []
      });
    }
    setIsInvoiceModalOpen(true);
  };

  const openOcrModal = () => {
    setIsOcrModalOpen(true);
  };

  const closeOcrModal = () => {
    setIsOcrModalOpen(false);
    handleRemoveFile();
  };

  const supplierOptions = suppliers.map(s => ({
    value: s.id,
    label: s.name
  }));

  const getInvoiceStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'success';
      case 'pending': return 'warning';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle>Gestion des Fournisseurs</CardTitle>
          <CardDescription>
            Gestion des fournisseurs et des factures avec intégration OCR
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Rechercher un fournisseur..."
                  value={searchQuery}
                  onChange={handleSearch}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => openSupplierModal()}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
              <Button variant="outline" onClick={() => openOcrModal()}>
                <Upload className="w-4 h-4 mr-2" />
                OCR Facture
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
                <Users className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Total Fournisseurs
                </p>
                <p className="font-bold text-2xl text-gray-900 dark:text-white">
                  {suppliers.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success-100 dark:bg-success-900/30 rounded-lg">
                <FileText className="w-5 h-5 text-success-600 dark:text-success-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Factures Totales
                </p>
                <p className="font-bold text-2xl text-gray-900 dark:text-white">
                  {invoices.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning-100 dark:bg-warning-900/30 rounded-lg">
                <Upload className="w-5 h-5 text-warning-600 dark:text-warning-400" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Factures en Attente
                </p>
                <p className="font-bold text-2xl text-gray-900 dark:text-white">
                  {invoices.filter(i => i.status === 'pending').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Suppliers Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des Fournisseurs ({filteredSuppliers.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchSuppliers}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Rafraîchir
          </Button>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucun fournisseur trouvé</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Téléphone</TableHead>
                  <TableHead>Adresse</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSuppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">
                      {supplier.name}
                    </TableCell>
                    <TableCell>
                      {supplier.contact}
                    </TableCell>
                    <TableCell>
                      {supplier.email || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {supplier.phone || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell>
                      {supplier.address || <span className="text-gray-400">-</span>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openSupplierModal(supplier)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="text-danger-500 hover:text-danger-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={() => openSupplierModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter un Fournisseur
          </Button>
        </CardFooter>
      </Card>

      <Separator />

      {/* Invoices Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Liste des Factures ({invoices.length})</CardTitle>
          <Button variant="outline" size="sm" onClick={fetchInvoices}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Rafraîchir
          </Button>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Aucune facture trouvée</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Facture</TableHead>
                  <TableHead>Fournisseur</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono">
                      {invoice.invoice_number}
                    </TableCell>
                    <TableCell>
                      {suppliers.find(s => s.id === invoice.supplier_id)?.name || invoice.supplier_name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {formatDate(invoice.date)}
                    </TableCell>
                    <TableCell>
                      {formatCurrency(invoice.total_amount || 0)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getInvoiceStatusColor(invoice.status)}>
                        {invoice.status === 'paid' ? 'Payée' : 
                         invoice.status === 'pending' ? 'En attente' : 
                         invoice.status === 'cancelled' ? 'Annulée' : invoice.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openInvoiceModal(invoice)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="text-danger-500 hover:text-danger-600"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter>
          <Button onClick={() => openInvoiceModal()}>
            <Plus className="w-4 h-4 mr-2" />
            Ajouter une Facture
          </Button>
          <Button variant="outline" onClick={() => openOcrModal()}>
            <Upload className="w-4 h-4 mr-2" />
            Scanner une Facture (OCR)
          </Button>
        </CardFooter>
      </Card>

      {/* Supplier Modal */}
      <Modal isOpen={isSupplierModalOpen} onClose={() => setIsSupplierModalOpen(false)} size="lg">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-600" />
            <span>{selectedSupplier ? 'Modifier le Fournisseur' : 'Ajouter un Fournisseur'}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <form onSubmit={handleSupplierSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nom *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Nom du fournisseur"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Contact</Label>
                <Input
                  value={formData.contact}
                  onChange={(e) => setFormData({...formData, contact: e.target.value})}
                  placeholder="Personne de contact"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  placeholder="email@fournisseur.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  placeholder="+221 XX XXX XX XX"
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <Label>Adresse</Label>
                <Input
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="Adresse complète"
                />
              </div>
            </div>
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsSupplierModalOpen(false)}>
            Annuler
          </Button>
          <Button type="submit" onClick={handleSupplierSubmit} isLoading={isSubmitting}>
            {selectedSupplier ? 'Mettre à jour' : 'Ajouter'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* Invoice Modal */}
      <Modal isOpen={isInvoiceModalOpen} onClose={() => setIsInvoiceModalOpen(false)} size="xl">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary-600" />
            <span>{selectedInvoice ? 'Modifier la Facture' : 'Ajouter une Facture'}</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <form onSubmit={handleInvoiceSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fournisseur *</Label>
                <Select
                  value={invoiceFormData.supplier_id}
                  onChange={(value) => setInvoiceFormData({...invoiceFormData, supplier_id: value})}
                  options={supplierOptions}
                  placeholder="Sélectionnez un fournisseur"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>N° Facture *</Label>
                <Input
                  value={invoiceFormData.invoice_number}
                  onChange={(e) => setInvoiceFormData({...invoiceFormData, invoice_number: e.target.value})}
                  placeholder="FACT-2024-001"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input
                  type="date"
                  value={invoiceFormData.date}
                  onChange={(e) => setInvoiceFormData({...invoiceFormData, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label>Montant Total (XOF)</Label>
                <Input
                  type="number"
                  value={invoiceFormData.total_amount}
                  onChange={(e) => setInvoiceFormData({...invoiceFormData, total_amount: parseFloat(e.target.value) || 0})}
                  placeholder="100000"
                  leftIcon={<DollarSign className="w-4 h-4" />}
                />
              </div>
            </div>

            {invoiceFormData.items && invoiceFormData.items.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <Label>Articles ({invoiceFormData.items.length})</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produit</TableHead>
                        <TableHead>Quantité</TableHead>
                        <TableHead>Prix Unitaire</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoiceFormData.items.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product_name || item.name || 'N/A'}</TableCell>
                          <TableCell>{item.quantity || 0}</TableCell>
                          <TableCell>{formatCurrency(item.unit_price || 0)}</TableCell>
                          <TableCell className="text-right">
                            {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </form>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={() => setIsInvoiceModalOpen(false)}>
            Annuler
          </Button>
          <Button type="submit" onClick={handleInvoiceSubmit} isLoading={isSubmitting}>
            {selectedInvoice ? 'Mettre à jour' : 'Ajouter'}
          </Button>
        </ModalFooter>
      </Modal>

      {/* OCR Modal */}
      <Modal isOpen={isOcrModalOpen} onClose={closeOcrModal} size="lg">
        <ModalHeader>
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary-600" />
            <span>Scanner une Facture (OCR)</span>
          </div>
        </ModalHeader>
        <ModalBody>
          <div className="space-y-4">
            <Alert variant="info" className="flex items-start gap-3">
              <Upload className="w-4 h-4 flex-shrink-0" />
              <div>
                <p className="font-medium">Numérisation de Facture</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Téléchargez une image ou un PDF de la facture pour extraction automatique des données
                </p>
              </div>
            </Alert>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".jpg,.jpeg,.png,.pdf"
                className="hidden"
              />
              
              {!file ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-4 cursor-pointer"
                >
                  <Upload className="w-12 h-12 text-gray-400" />
                  <p className="text-sm text-gray-500">
                    Glisser-déposer ou cliquer pour télécharger
                  </p>
                  <p className="text-xs text-gray-400">
                    Formats supportés: JPG, PNG, PDF
                  </p>
                </button>
              ) : (
                <div className="space-y-4">
                  {previewUrl && (
                    <div className="relative inline-block">
                      {previewUrl.match(/\.pdf$/i) ? (
                        <div className="bg-red-100 dark:bg-red-900/30 p-4 rounded-lg">
                          <FileText className="w-16 h-16 text-red-600 dark:text-red-400" />
                          <p className="text-sm mt-2">Document PDF</p>
                        </div>
                      ) : (
                        <img
                          src={previewUrl}
                          alt="Aperçu"
                          className="max-w-full max-h-48 rounded-lg"
                        />
                      )}
                      <button
                        type="button"
                        onClick={handleRemoveFile}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  
                  <Button
                    onClick={handleOcrUpload}
                    isLoading={loading}
                    className="w-full"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Analyser avec OCR
                  </Button>
                </div>
              )}
            </div>

            {ocrResult && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="font-medium">Résultats OCR</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Fournisseur</Label>
                      <Input
                        value={ocrResult.supplier?.name || ''}
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>N° Facture</Label>
                      <Input
                        value={ocrResult.invoice_number || ''}
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date</Label>
                      <Input
                        value={ocrResult.date ? formatDate(ocrResult.date) : ''}
                        readOnly
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Montant Total</Label>
                      <Input
                        value={formatCurrency(ocrResult.total_amount || 0)}
                        readOnly
                      />
                    </div>
                  </div>

                  {ocrResult.items && ocrResult.items.length > 0 && (
                    <div className="space-y-2">
                      <Label>Articles ({ocrResult.items.length})</Label>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Produit</TableHead>
                            <TableHead>Quantité</TableHead>
                            <TableHead>Prix Unitaire</TableHead>
                            <TableHead className="text-right">Total</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ocrResult.items.map((item, index) => (
                            <TableRow key={index}>
                              <TableCell>{item.product_name || item.name || 'N/A'}</TableCell>
                              <TableCell>{item.quantity || 0}</TableCell>
                              <TableCell>{formatCurrency(item.unit_price || 0)}</TableCell>
                              <TableCell className="text-right">
                                {formatCurrency((item.quantity || 0) * (item.unit_price || 0))}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  <Alert variant="success" className="flex items-center gap-3">
                    <Check className="w-4 h-4 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Données extraites avec succès</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Vous pouvez maintenant créer une facture avec ces données
                      </p>
                    </div>
                  </Alert>

                  <Button
                    onClick={() => {
                      closeOcrModal();
                      openInvoiceModal();
                    }}
                    className="w-full"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    Créer une Facture avec ces Données
                  </Button>
                </div>
              </>
            )}
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="outline" onClick={closeOcrModal}>
            Fermer
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
};

// Import DollarSign for use in Input
import { DollarSign } from 'lucide-react';

export default SuppliersPage;
