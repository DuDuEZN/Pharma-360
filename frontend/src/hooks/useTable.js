/**
 * Hook for managing table state (pagination, sorting, filtering)
 */

import { useState, useCallback, useMemo } from 'react'
import { TABLE, PAGINATION } from '@/lib/constants'

const useTable = (initialData = [], options = {}) => {
  const {
    pageSize: initialPageSize = PAGINATION.DEFAULT_PAGE_SIZE,
    sortBy: initialSortBy = TABLE.DEFAULT_SORT,
    sortOrder: initialSortOrder = TABLE.DEFAULT_ORDER,
    searchable = true,
    filterable = true
  } = options

  const [data, setData] = useState(initialData)
  const [page, setPage] = useState(PAGINATION.DEFAULT_PAGE)
  const [pageSize, setPageSize] = useState(initialPageSize)
  const [sortBy, setSortBy] = useState(initialSortBy)
  const [sortOrder, setSortOrder] = useState(initialSortOrder)
  const [searchQuery, setSearchQuery] = useState('')
  const [filters, setFilters] = useState({})

  // Handle sort
  const handleSort = useCallback((column) => {
    if (sortBy === column) {
      // Toggle sort order
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      // New column, default to ascending
      setSortBy(column)
      setSortOrder('asc')
    }
    // Reset to first page when sorting changes
    setPage(PAGINATION.DEFAULT_PAGE)
  }, [sortBy, sortOrder])

  // Handle pagination
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage)
  }, [])

  const handlePageSizeChange = useCallback((newPageSize) => {
    setPageSize(newPageSize)
    setPage(PAGINATION.DEFAULT_PAGE) // Reset to first page
  }, [])

  // Handle search
  const handleSearch = useCallback((query) => {
    setSearchQuery(query)
    setPage(PAGINATION.DEFAULT_PAGE) // Reset to first page
  }, [])

  // Handle filter change
  const handleFilterChange = useCallback((filterName, filterValue) => {
    setFilters((prev) => ({
      ...prev,
      [filterName]: filterValue
    }))
    setPage(PAGINATION.DEFAULT_PAGE) // Reset to first page
  }, [])

  // Handle multiple filter changes
  const handleFiltersChange = useCallback((newFilters) => {
    setFilters(newFilters)
    setPage(PAGINATION.DEFAULT_PAGE)
  }, [])

  // Clear filters
  const clearFilters = useCallback(() => {
    setFilters({})
    setSearchQuery('')
    setPage(PAGINATION.DEFAULT_PAGE)
  }, [])

  // Processed data with sorting, searching, and filtering
  const processedData = useMemo(() => {
    let result = [...data]

    // Apply filters
    if (filterable && Object.keys(filters).length > 0) {
      result = result.filter((item) => {
        return Object.entries(filters).every(([key, value]) => {
          if (!value) return true
          const itemValue = item[key]
          if (itemValue === undefined || itemValue === null) return false
          return String(itemValue).toLowerCase().includes(String(value).toLowerCase())
        })
      })
    }

    // Apply search
    if (searchable && searchQuery) {
      const query = searchQuery.toLowerCase()
      result = result.filter((item) => {
        return Object.values(item).some((value) => {
          if (value === undefined || value === null) return false
          return String(value).toLowerCase().includes(query)
        })
      })
    }

    // Apply sorting
    if (sortBy) {
      result.sort((a, b) => {
        const aValue = a[sortBy]
        const bValue = b[sortBy]
        
        if (aValue === bValue) return 0
        if (aValue === null || aValue === undefined) return 1
        if (bValue === null || bValue === undefined) return -1
        
        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1
        } else {
          return aValue < bValue ? 1 : -1
        }
      })
    }

    return result
  }, [data, sortBy, sortOrder, searchQuery, filters, searchable, filterable])

  // Paginated data
  const paginatedData = useMemo(() => {
    const startIndex = (page - 1) * pageSize
    return processedData.slice(startIndex, startIndex + pageSize)
  }, [processedData, page, pageSize])

  // Pagination info
  const total = processedData.length
  const totalPages = Math.ceil(total / pageSize)
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  // Reset table state
  const resetTable = useCallback(() => {
    setPage(PAGINATION.DEFAULT_PAGE)
    setPageSize(initialPageSize)
    setSortBy(initialSortBy)
    setSortOrder(initialSortOrder)
    setSearchQuery('')
    setFilters({})
  }, [initialPageSize, initialSortBy, initialSortOrder])

  return {
    // State
    data,
    page,
    pageSize,
    sortBy,
    sortOrder,
    searchQuery,
    filters,
    
    // Processed data
    processedData,
    paginatedData,
    
    // Pagination info
    total,
    totalPages,
    hasNextPage,
    hasPrevPage,
    
    // Handlers
    setData,
    handleSort,
    handlePageChange,
    handlePageSizeChange,
    handleSearch,
    handleFilterChange,
    handleFiltersChange,
    clearFilters,
    resetTable
  }
}

export { useTable }
