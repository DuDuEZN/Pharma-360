import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import api from '@/lib/api'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input.jsx'

/**
 * ProductSearchSelect
 *
 * Remplace un long menu déroulant de produits par une barre de recherche
 * avec suggestions (filtrage côté serveur + debounce).
 *
 * Props :
 * - value / onChange : identifiant produit sous forme de chaîne ("all" = tous)
 * - fallbackOptions : liste locale de produits pour afficher le libellé
 *   du produit sélectionné lorsqu'il n'est pas dans les résultats visibles.
 */
export default function ProductSearchSelect({
  value = 'all',
  onChange,
  placeholder = 'Rechercher un produit...',
  className,
  includeAll = true,
  allLabel = 'Tous les produits',
  fallbackOptions = [],
  limit = 20,
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const containerRef = useRef(null)
  const requestIdRef = useRef(0)

  const selectedFromFallback = useMemo(() => {
    if (value === 'all' || value === undefined || value === null || value === '') return null
    const found = (fallbackOptions || []).find(
      (item) => String(item.id) === String(value)
    )
    return found || null
  }, [value, fallbackOptions])

  const selectedFromResults = useMemo(() => {
    if (value === 'all' || value === undefined || value === null || value === '') return null
    const found = results.find((item) => String(item.id) === String(value))
    return found || null
  }, [value, results])

  const selectedLabel = useMemo(() => {
    if (value === 'all' || value === undefined || value === null || value === '') {
      return allLabel
    }
    if (selectedFromFallback) return selectedFromFallback.name
    if (selectedFromResults) return selectedFromResults.name
    return `Produit #${value}`
  }, [value, allLabel, selectedFromFallback, selectedFromResults])

  // Fermer le menu au clic extérieur.
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Recherche avec debounce (300 ms).
  useEffect(() => {
    if (!isOpen) return undefined
    const requestId = requestIdRef.current + 1
    requestIdRef.current = requestId
    setIsLoading(true)

    const timer = setTimeout(async () => {
      try {
        const response = await api.get('/products/search', {
          params: { query: query.trim(), limit },
        })
        if (requestIdRef.current !== requestId) return
        setResults(response.data?.products || [])
      } catch (error) {
        if (requestIdRef.current !== requestId) return
        setResults([])
      } finally {
        if (requestIdRef.current === requestId) setIsLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, isOpen, limit])

  const handleSelect = (product) => {
    onChange?.(product ? String(product.id) : 'all')
    setIsOpen(false)
    setQuery('')
  }

  const handleClear = () => {
    onChange?.('all')
    setQuery('')
    setIsOpen(false)
  }

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      setIsOpen(false)
      setQuery('')
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      if (results.length > 0) handleSelect(results[0])
    }
  }

  const options = includeAll
    ? [{ id: 'all', name: allLabel }, ...results]
    : results

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input
          type="text"
          value={isOpen ? query : selectedLabel}
          placeholder={placeholder}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value)
            if (!isOpen) setIsOpen(true)
          }}
          onKeyDown={handleKeyDown}
          className="pl-9 pr-9"
          aria-label="Rechercher un produit"
          autoComplete="off"
        />
        {isLoading ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-gray-400" />
        ) : (
          value !== 'all' &&
          value !== undefined &&
          value !== null &&
          value !== '' && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/10"
              title="Retirer le filtre produit"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 mt-1 max-h-64 w-full min-w-[16rem] overflow-y-auto rounded-xl border border-black/10 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-secondary-900">
          {options.length === 0 && !isLoading ? (
            <p className="px-3 py-2 text-sm text-gray-500">Aucun produit trouvé</p>
          ) : (
            options.map((product) => {
              const isSelected = String(product.id) === String(value)
              return (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelect(product.id === 'all' ? null : product)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors',
                    'hover:bg-gray-100 dark:hover:bg-white/10',
                    isSelected && 'bg-primary-50 font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-300'
                  )}
                >
                  <span className="truncate">{product.name}</span>
                  {product.barcode && (
                    <span className="shrink-0 font-mono text-xs text-gray-400">
                      {product.barcode}
                    </span>
                  )}
                </button>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
