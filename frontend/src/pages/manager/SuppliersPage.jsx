import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, FileText, Eye, Edit, Trash2, Plus, Search, Download, Camera } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from 'sonner';

const SuppliersPage = () => {
  const [suppliers, setSuppliers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isOcrDialogOpen, setIsOcrDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [ocrResult, setOcrResult] = useState(null);
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
      toast.error('Erreur lors du chargement des fournisseurs');
    }
  };

  const fetchInvoices = async () => {
    try {
      const response = await api.get('/invoices');
      setInvoices(response.data || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Erreur lors du chargement des factures');
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
      setFile(selectedFile);
      setPreviewUrl(URL.createObjectURL(selectedFile));
    }
  };

  const handleOcrUpload = async () => {
    if (!file) {
      toast.error('Veuillez sélectionner un fichier');
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

      if (response.data) {
        setOcrResult(response.data);
        setInvoiceFormData(prev => ({
          ...prev,
          supplier_id: response.data.supplier_id || '',
          invoice_number: response.data.invoice_number || '',
          date: response.data.date || new Date().toISOString().split('T')[0],
          total_amount: response.data.total_amount || 0,
          items: response.data.items || []
        }));
        toast.success('OCR terminé avec succès');
      }
    } catch (error) {
      console.error('Error during OCR:', error);
      toast.error('Erreur lors du traitement OCR');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSupplier = async () => {
    try {
      const response = await api.post('/suppliers', formData);
      if (response.data) {
        toast.success('Fournisseur créé avec succès');
        setIsDialogOpen(false);
        setFormData({ name: '', contact: '', email: '', address: '', phone: '' });
        fetchSuppliers();
      }
    } catch (error) {
      console.error('Error creating supplier:', error);
      toast.error('Erreur lors de la création du fournisseur');
    }
  };

  const handleCreateInvoice = async () => {
    try {
      const response = await api.post('/invoices', invoiceFormData);
      if (response.data) {
        toast.success('Facture créée avec succès');
        setIsInvoiceDialogOpen(false);
        setInvoiceFormData({
          supplier_id: '',
          invoice_number: '',
          date: new Date().toISOString().split('T')[0],
          total_amount: 0,
          items: []
        });
        fetchInvoices();
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Erreur lors de la création de la facture');
    }
  };

  const handleDeleteSupplier = async (id) => {
    try {
      await api.delete(`/suppliers/${id}`);
      toast.success('Fournisseur supprimé avec succès');
      fetchSuppliers();
    } catch (error) {
      console.error('Error deleting supplier:', error);
      toast.error('Erreur lors de la suppression du fournisseur');
    }
  };

  const handleDeleteInvoice = async (id) => {
    try {
      await api.delete(`/invoices/${id}`);
      toast.success('Facture supprimée avec succès');
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Erreur lors de la suppression de la facture');
    }
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const response = await api.get(`/invoices/${invoiceId}/pdf`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `facture_${invoiceId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      toast.error('Erreur lors du téléchargement de la facture');
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Fournisseurs</h1>
          <p className="text-muted-foreground">Gestion des fournisseurs et factures</p>
        </div>
        <div className="flex gap-4">
          <Dialog open={isOcrDialogOpen} onOpenChange={setIsOcrDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {}}>
                <Upload className="h-4 w-4 mr-2" />
                Importer Facture (OCR)
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>Importer Facture via OCR</DialogTitle>
              </DialogHeader>
              <Card>
                <CardContent className="space-y-4">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/*,.pdf,.jpg,.jpeg,.png"
                      className="hidden"
                    />
                    {previewUrl ? (
                      <div className="space-y-4">
                        <img
                          src={previewUrl}
                          alt="Preview"
                          className="max-h-64 mx-auto rounded"
                        />
                        <Button
                          variant="outline"
                          onClick={() => {
                            setPreviewUrl('');
                            setFile(null);
                          }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    ) : (
                      <div>
                        <Camera className="h-12 w-12 mx-auto text-gray-400 mb-2" />
                        <p className="text-gray-500 mb-2">Glissez-déposez ou cliquez pour sélectionner</p>
                        <Button onClick={triggerFileInput}>
                          Sélectionner un fichier
                        </Button>
                      </div>
                    )}
                  </div>
                  {file && (
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          onClick={handleOcrUpload}
                          disabled={loading}
                        >
                          {loading ? 'Traitement...' : 'Traiter avec OCR'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setFile(null);
                            setPreviewUrl('');
                          }}
                        >
                          Annuler
                        </Button>
                      </div>
                      {ocrResult && (
                        <div className="border rounded-lg p-4 bg-gray-50">
                          <h3 className="font-semibold mb-2">Résultat OCR</h3>
                          <pre className="text-sm overflow-auto">{JSON.stringify(ocrResult, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOcrDialogOpen(false)}>
                  Fermer
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouvelle Facture
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Nouvelle Facture</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fournisseur</Label>
                    <Select
                      value={invoiceFormData.supplier_id}
                      onValueChange={(value) => setInvoiceFormData(prev => ({ ...prev, supplier_id: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un fournisseur" />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map(supplier => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            {supplier.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Numéro de Facture</Label>
                    <Input
                      value={invoiceFormData.invoice_number}
                      onChange={(e) => setInvoiceFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                      placeholder="NUM-2025-001"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input
                      type="date"
                      value={invoiceFormData.date}
                      onChange={(e) => setInvoiceFormData(prev => ({ ...prev, date: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Montant Total (XOF)</Label>
                    <Input
                      type="number"
                      value={invoiceFormData.total_amount}
                      onChange={(e) => setInvoiceFormData(prev => ({ ...prev, total_amount: parseFloat(e.target.value) || 0 }))}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateInvoice}>
                  Créer Facture
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nouveau Fournisseur
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nouveau Fournisseur</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Nom du fournisseur"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Contact</Label>
                  <Input
                    value={formData.contact}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact: e.target.value }))}
                    placeholder="Nom du contact"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@fournisseur.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Téléphone</Label>
                    <Input
                      value={formData.phone}
                      onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+229 XX XX XX XX"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Adresse</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Adresse complète"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateSupplier}>
                  Créer Fournisseur
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 max-w-md">
            <Search className="h-4 w-4 text-gray-500" />
            <Input
              type="text"
              placeholder="Rechercher un fournisseur..."
              value={searchQuery}
              onChange={handleSearch}
              className="flex-1"
            />
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Fournisseurs</CardTitle>
          <CardDescription>
            Gestion des fournisseurs de médicaments et produits
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              {filteredSuppliers.length > 0 ? (
                filteredSuppliers.map(supplier => (
                  <TableRow key={supplier.id}>
                    <TableCell className="font-medium">{supplier.name}</TableCell>
                    <TableCell>{supplier.contact}</TableCell>
                    <TableCell>{supplier.email}</TableCell>
                    <TableCell>{supplier.phone}</TableCell>
                    <TableCell className="max-w-[200px] truncate">{supplier.address}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedSupplier(supplier)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSupplier(supplier.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    Aucun fournisseur trouvé
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>Factures Fournisseurs</CardTitle>
          <CardDescription>
            Historique des factures et statuts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Numéro</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Montant (XOF)</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length > 0 ? (
                invoices.map(invoice => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.invoice_number}</TableCell>
                    <TableCell>{invoice.supplier_name}</TableCell>
                    <TableCell>{new Date(invoice.date).toLocaleDateString('fr-FR')}</TableCell>
                    <TableCell>{new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF' }).format(invoice.total_amount)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-800' :
                        invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {invoice.status === 'paid' ? 'Payée' : invoice.status === 'pending' ? 'En attente' : 'Annulée'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex gap-2 justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownloadInvoice(invoice.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteInvoice(invoice.id)}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500">
                    Aucune facture trouvée
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuppliersPage;
