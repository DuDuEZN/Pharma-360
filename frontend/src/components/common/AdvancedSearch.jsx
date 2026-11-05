import React, { useState, useEffect, useCallback } from 'react';
import { Input } from './Input';
import { Button } from './Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select.jsx';
import { Search, Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

/**
 * AdvancedSearch Component for Pharma-360
 * Provides multi-criteria filtering with dynamic search
 * 
 * FRNT-013: Recherche Avancée (filtres)
 */

const AdvancedSearch = ({
  onSearch,
  fields = [],
  initialFilters = {},
  placeholder = 'Rechercher...',
  className = '',
  ...props
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);

  // Initialize filters from fields
  useEffect(() => {
    const initialState = {};
    fields.forEach(field => {
      initialState[field.name] = field.defaultValue || '';
    });
    setFilters({ ...initialState, ...initialFilters });
  }, [fields, initialFilters]);

  // Handle search term change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Handle filter change
  const handleFilterChange = (fieldName, value) => {
    setFilters(prev => ({
      ...prev,
      [fieldName]: value
    }));

    // Update active filters
    if (value && value !== '') {
      if (!activeFilters.includes(fieldName)) {
        setActiveFilters(prev => [...prev, fieldName]);
      }
    } else {
      setActiveFilters(prev => prev.filter(f => f !== fieldName));
    }
  };

  // Clear a specific filter
  const clearFilter = (fieldName) => {
    setFilters(prev => ({
      ...prev,
      [fieldName]: ''
    }));
    setActiveFilters(prev => prev.filter(f => f !== fieldName));
  };

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm('');
    const cleared = {};
    fields.forEach(field => {
      cleared[field.name] = '';
    });
    setFilters(cleared);
    setActiveFilters([]);
    
    if (onSearch) {
      onSearch({ search: '', ...cleared });
    }
  };

  // Apply search with debounce
  const debouncedSearch = useCallback(
    debounce((searchParams) => {
      if (onSearch) {
        onSearch(searchParams);
      }
    }, 500),
    [onSearch]
  );

  // Trigger search when filters or search term change
  useEffect(() => {
    const searchParams = {
      search: searchTerm,
      ...filters
    };
    debouncedSearch(searchParams);
  }, [searchTerm, filters, debouncedSearch]);

  // Toggle expanded state
  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Get filter field by name
  const getField = (name) => fields.find(f => f.name === name);

  // Render filter input based on type
  const renderFilterInput = (field) => {
    switch (field.type) {
      case 'select':
        return (
          <Select
            value={filters[field.name] || ''}
            onValueChange={(value) => handleFilterChange(field.name, value)}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={field.placeholder || `Sélectionner ${field.label}`} />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label || option.value}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      
      case 'number':
        return (
          <Input
            type="number"
            value={filters[field.name] || ''}
            onChange={(e) => handleFilterChange(field.name, e.target.value)}
            placeholder={field.placeholder || field.label}
            min={field.min}
            max={field.max}
          />
        );
      
      case 'date':
        return (
          <Input
            type="date"
            value={filters[field.name] || ''}
            onChange={(e) => handleFilterChange(field.name, e.target.value)}
            placeholder={field.placeholder || field.label}
          />
        );
      
      case 'range':
        return (
          <div className="flex gap-2">
            <Input
              type="number"
              value={filters[`${field.name}_min`] || ''}
              onChange={(e) => handleFilterChange(`${field.name}_min`, e.target.value)}
              placeholder={`Min ${field.label}`}
            />
            <span className="self-center">-</span>
            <Input
              type="number"
              value={filters[`${field.name}_max`] || ''}
              onChange={(e) => handleFilterChange(`${field.name}_max`, e.target.value)}
              placeholder={`Max ${field.label}`}
            />
          </div>
        );
      
      default: // text
        return (
          <Input
            type="text"
            value={filters[field.name] || ''}
            onChange={(e) => handleFilterChange(field.name, e.target.value)}
            placeholder={field.placeholder || field.label}
          />
        );
    }
  };

  // Helper function for debounce
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  return (
    <div className={`advanced-search ${className}`} {...props}>
      {/* Main search bar */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={placeholder}
            className="pl-10"
          />
          {activeFilters.length > 0 && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
              {activeFilters.length}
            </span>
          )}
        </div>

        {/* Toggle button for filters */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleExpanded}
            className="flex-1 justify-between"
          >
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filtres
            </span>
            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
          
          {activeFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="text-red-600 hover:text-red-700"
            >
              <X className="h-4 w-4 mr-1" />
              Effacer
            </Button>
          )}
        </div>
      </div>

      {/* Expanded filters panel */}
      {isExpanded && fields.length > 0 && (
        <div className="mt-3 p-4 border rounded-lg bg-gray-50/50 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {fields.map((field) => (
              <div key={field.name} className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  {field.label}
                </label>
                {renderFilterInput(field)}
              </div>
            ))}
          </div>
          
          {/* Active filters display */}
          {activeFilters.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-2">Filtres actifs:</h4>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map(fieldName => {
                  const field = getField(fieldName);
                  const value = filters[fieldName];
                  if (!value || value === '') return null;
                  
                  return (
                    <div 
                      key={fieldName}
                      className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                    >
                      <span>{field?.label || fieldName}: {value}</span>
                      <button
                        onClick={() => clearFilter(fieldName)}
                        className="hover:bg-blue-200 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * Pre-configured AdvancedSearch for Products
 */
export const ProductAdvancedSearch = ({ onSearch, categories = [], suppliers = [] }) => {
  const fields = [
    {
      name: 'category_id',
      label: 'Catégorie',
      type: 'select',
      options: categories.map(c => ({ value: c.id || c.value, label: c.name || c.label })),
      placeholder: 'Toutes les catégories'
    },
    {
      name: 'supplier_id',
      label: 'Fournisseur',
      type: 'select',
      options: suppliers.map(s => ({ value: s.id || s.value, label: s.name || s.label })),
      placeholder: 'Tous les fournisseurs'
    },
    {
      name: 'min_stock',
      label: 'Stock Minimum',
      type: 'number',
      placeholder: '0',
      min: 0
    },
    {
      name: 'max_stock',
      label: 'Stock Maximum',
      type: 'number',
      placeholder: '1000',
      min: 0
    },
    {
      name: 'price_min',
      label: 'Prix Minimum (XOF)',
      type: 'number',
      placeholder: '0',
      min: 0
    },
    {
      name: 'price_max',
      label: 'Prix Maximum (XOF)',
      type: 'number',
      placeholder: '100000',
      min: 0
    },
    {
      name: 'expiring_soon',
      label: 'Péremption dans',
      type: 'select',
      options: [
        { value: '7', label: '7 jours' },
        { value: '30', label: '30 jours' },
        { value: '60', label: '60 jours' },
        { value: '90', label: '90 jours' }
      ],
      placeholder: 'Toutes périodes'
    }
  ];

  return (
    <AdvancedSearch
      onSearch={onSearch}
      fields={fields}
      placeholder="Rechercher des produits..."
    />
  );
};

/**
 * Pre-configured AdvancedSearch for Sales
 */
export const SalesAdvancedSearch = ({ onSearch, users = [], customers = [] }) => {
  const fields = [
    {
      name: 'user_id',
      label: 'Utilisateur',
      type: 'select',
      options: users.map(u => ({ value: u.id || u.value, label: u.name || u.label })),
      placeholder: 'Tous les utilisateurs'
    },
    {
      name: 'customer_id',
      label: 'Client',
      type: 'select',
      options: customers.map(c => ({ value: c.id || c.value, label: c.name || c.label })),
      placeholder: 'Tous les clients'
    },
    {
      name: 'start_date',
      label: 'Date de début',
      type: 'date'
    },
    {
      name: 'end_date',
      label: 'Date de fin',
      type: 'date'
    },
    {
      name: 'min_amount',
      label: 'Montant Minimum (XOF)',
      type: 'number',
      placeholder: '0',
      min: 0
    },
    {
      name: 'max_amount',
      label: 'Montant Maximum (XOF)',
      type: 'number',
      placeholder: '1000000',
      min: 0
    },
    {
      name: 'status',
      label: 'Statut',
      type: 'select',
      options: [
        { value: 'COMPLETED', label: 'Complétée' },
        { value: 'PENDING', label: 'En attente' },
        { value: 'CANCELLED', label: 'Annulée' }
      ],
      placeholder: 'Tous les statuts'
    }
  ];

  return (
    <AdvancedSearch
      onSearch={onSearch}
      fields={fields}
      placeholder="Rechercher des ventes..."
    />
  );
};

/**
 * Pre-configured AdvancedSearch for Stock Movements
 */
export const StockMovementAdvancedSearch = ({ onSearch, products = [], users = [] }) => {
  const fields = [
    {
      name: 'product_id',
      label: 'Produit',
      type: 'select',
      options: products.map(p => ({ value: p.id || p.value, label: p.name || p.label })),
      placeholder: 'Tous les produits'
    },
    {
      name: 'user_id',
      label: 'Utilisateur',
      type: 'select',
      options: users.map(u => ({ value: u.id || u.value, label: u.name || u.label })),
      placeholder: 'Tous les utilisateurs'
    },
    {
      name: 'movement_type',
      label: 'Type de mouvement',
      type: 'select',
      options: [
        { value: 'IN', label: 'Entrée' },
        { value: 'OUT', label: 'Sortie' },
        { value: 'RETURN', label: 'Retour' },
        { value: 'ADJUSTMENT', label: 'Ajustement' }
      ],
      placeholder: 'Tous les types'
    },
    {
      name: 'start_date',
      label: 'Date de début',
      type: 'date'
    },
    {
      name: 'end_date',
      label: 'Date de fin',
      type: 'date'
    }
  ];

  return (
    <AdvancedSearch
      onSearch={onSearch}
      fields={fields}
      placeholder="Rechercher des mouvements de stock..."
    />
  );
};

export default AdvancedSearch;
