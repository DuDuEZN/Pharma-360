import React, { forwardRef } from 'react';
import { Button } from '../Button';
import { Select } from '../Select';
import { cn } from '../../lib/utils';

const Pagination = forwardRef(({
  className,
  currentPage = 1,
  totalPages = 1,
  pageSize = 10,
  totalItems = 0,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  showPageSizeChanger = true,
  showQuickJumper = false,
  showTotal = true,
  ...props
}, ref) => {
  const handlePrevious = () => {
    if (currentPage > 1 && onPageChange) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages && onPageChange) {
      onPageChange(currentPage + 1);
    }
  };

  const handlePageClick = (page) => {
    if (page !== currentPage && onPageChange) {
      onPageChange(page);
    }
  };

  const handlePageSizeChange = (value) => {
    if (onPageSizeChange) {
      onPageSizeChange(Number(value));
      onPageChange?.(1); // Reset to first page when page size changes
    }
  };

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(
        <Button
          key={i}
          variant={i === currentPage ? 'primary' : 'outline'}
          size="sm"
          onClick={() => handlePageClick(i)}
          className="w-8 h-8 p-0"
        >
          {i}
        </Button>
      );
    }

    return pages;
  };

  return (
    <div
      ref={ref}
      className={cn('flex flex-col sm:flex-row items-center justify-between gap-4', className)}
      {...props}
    >
      {showTotal && (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalItems)} of {totalItems} items
        </div>
      )}

      <div className="flex items-center gap-2">
        {showPageSizeChanger && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Rows per page:</span>
            <Select
              value={String(pageSize)}
              onChange={handlePageSizeChange}
              options={pageSizeOptions.map(size => ({
                value: String(size),
                label: String(size),
              }))}
              size="sm"
              className="w-20"
            />
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevious}
            disabled={currentPage <= 1}
            className="w-8 h-8 p-0"
          >
            &lt;
          </Button>
          
          {renderPageNumbers()}
          
          <Button
            variant="outline"
            size="sm"
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="w-8 h-8 p-0"
          >
            &gt;
          </Button>
        </div>

        {showQuickJumper && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Go to:</span>
            <input
              type="number"
              min={1}
              max={totalPages}
              value={currentPage}
              onChange={(e) => {
                const page = parseInt(e.target.value);
                if (!isNaN(page) && page >= 1 && page <= totalPages) {
                  handlePageClick(page);
                }
              }}
              className="w-16 h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-center dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
          </div>
        )}
      </div>
    </div>
  );
});

Pagination.displayName = 'Pagination';

export default Pagination;
