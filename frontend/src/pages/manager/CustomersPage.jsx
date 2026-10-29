import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Edit, Trash2, Search, User, Phone, Mail, MapPin } from 'lucide-react';
import { api } from '@/services/api';
import { toast } from 'sonner';
import { AdvancedSearch } from '@/components/common';

/**
 * Customers Management Page for Pharma-360
 * CRUD operations for customers
 * 
 * FRNT-014: Gestion Clients/Fournisseurs
 */

const CustomersPage = () => {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    loyalty_points: 0,
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({});

  // Fetch customers from API
  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/customers', { params: searchParams });
      setCustomers(response.data || []);
      setFilteredCustomers(response.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      toast.error('Erreur lors du chargement des clients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [searchParams]);

  // Handle search
  const handleSearch = (params) => {
    setSearchParams(params);
  };

  // Handle form input change
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Open dialog for new customer
  const openNewDialog = () => {
    setCurrentCustomer(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      address: '',
      loyalty_points: 0,
      notes: ''
    });
    setIsDialogOpen(true);
  };

  // Open dialog for editing customer
  const openEditDialog = (customer) => {
    setCurrentCustomer(customer);
    setFormData({
      name: customer.name || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      loyalty_points: customer.loyalty_points || 0,
      notes: customer.notes || ''
    });
    setIsDialogOpen(true);
  };

  // Open delete confirmation dialog
  const openDeleteDialog = (customer) => {
    setCurrentCustomer(customer);
    setIsDeleteDialogOpen(true);
  };

  // Create or update customer
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (currentCustomer) {
        // Update existing customer
        await api.put(`/customers/${currentCustomer.id}`, formData);
        toast.success('Client mis à jour avec succès');
      } else {
        // Create new customer
        await api.post('/customers', formData);
        toast.success('Client créé avec succès');
      }
      
      fetchCustomers();
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Error saving customer:', error);
      toast.error('Erreur lors de l\'enregistrement du client');
    } finally {
      setLoading(false);
    }
  };

  // Delete customer
  const handleDelete = async () => {
    if (!currentCustomer) return;
    
    try {
      setLoading(true);
      await api.delete(`/customers/${currentCustomer.id}`);
      toast.success('Client supprimé avec succès');
      fetchCustomers();
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting customer:', error);
      toast.error('Erreur lors de la suppression du client');
    } finally {
      setLoading(false);
    }
  };

  // Filter customers based on search
  const filterCustomers = (customers, params) => {
    return customers.filter(customer => {
      const nameMatch = params.search 
        ? customer.name?.toLowerCase().includes(params.search.toLowerCase())
        : true;
      const phoneMatch = params.phone 
        ? customer.phone?.includes(params.phone)
        : true;
      const emailMatch = params.email 
        ? customer.email?.toLowerCase().includes(params.email.toLowerCase())
        : true;
      const addressMatch = params.address 
        ? customer.address?.toLowerCase().includes(params.address.toLowerCase())
        : true;
      
      return nameMatch && phoneMatch && emailMatch && addressMatch;
    });
  };

  // Search fields configuration
  const searchFields = [
    {
      name: 'name',
      label: 'Nom',
      type: 'text',
      placeholder: 'Rechercher par nom'
    },
    {
      name: 'phone',
      label: 'Téléphone',
      type: 'text',
      placeholder: 'Rechercher par téléphone'
    },
    {
      name: 'email',
      label: 'Email',
      type: 'text',
      placeholder: 'Rechercher par email'
    },
    {
      name: 'address',
      label: 'Adresse',
      type: 'text',
      placeholder: 'Rechercher par adresse'
    }
  ];

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Gestion des Clients</h1>
          <p className="text-sm text-gray-600">Gérez vos clients et leurs informations</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNewDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Client
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {currentCustomer ? 'Modifier le Client' : 'Nouveau Client'}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom *</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  placeholder="Nom complet du client"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">Téléphone</Label>
                <Input
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Numéro de téléphone"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Adresse email"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Adresse complète"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="loyalty_points">Points de fidélité</Label>
                <Input
                  id="loyalty_points"
                  name="loyalty_points"
                  type="number"
                  value={formData.loyalty_points}
                  onChange={handleInputChange}
                  placeholder="0"
                  min="0"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  placeholder="Notes supplémentaires"
                />
              </div>
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Enregistrement...' : 'Enregistrer'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Supprimer le Client</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p>Êtes-vous sûr de vouloir supprimer ce client ? Cette action est irréversible.</p>
              {currentCustomer && (
                <div className="mt-4 p-3 bg-gray-100 rounded">
                  <p className="font-medium">{currentCustomer.name}</p>
                  <p className="text-sm text-gray-600">{currentCustomer.phone}</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                Annuler
              </Button>
              <Button type="button" variant="destructive" onClick={handleDelete} disabled={loading}>
                {loading ? 'Suppression...' : 'Supprimer'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Advanced Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <AdvancedSearch
            onSearch={handleSearch}
            fields={searchFields}
            placeholder="Rechercher des clients..."
          />
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des Clients ({customers.length})</CardTitle>
          <CardDescription>
            Tous vos clients enregistrés dans le système
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Chargement...</div>
          ) : customers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Aucun client trouvé. Commencez par en ajouter un.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Nom</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Adresse</TableHead>
                    <TableHead>Points</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>#{customer.id}</TableCell>
                      <TableCell className="font-medium">{customer.name}</TableCell>
                      <TableCell>{customer.phone}</TableCell>
                      <TableCell>{customer.email}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{customer.address}</TableCell>
                      <TableCell>{customer.loyalty_points || 0}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(customer)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(customer)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{customers.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients avec Email</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => c.email).length}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clients avec Téléphone</CardTitle>
            <Phone className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {customers.filter(c => c.phone).length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CustomersPage;
