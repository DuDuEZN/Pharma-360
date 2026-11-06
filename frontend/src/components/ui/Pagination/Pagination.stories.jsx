import React, { useState } from 'react';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationFirst, PaginationLast, PaginationNext, PaginationPrevious, PaginationItem, PaginationLink } from './Pagination';

export default {
  title: 'Design System/Pagination',
  component: Pagination,
  tags: ['autodocs'],
  subcomponents: { PaginationContent, PaginationEllipsis, PaginationFirst, PaginationLast, PaginationNext, PaginationPrevious, PaginationItem, PaginationLink },
};

export const Default = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(1);
    const totalPages = 10;
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              isActive={currentPage > 1}
            />
          </PaginationItem>
          {Array.from({ length: Math.min(totalPages, 5) }).map((_, i) => (
            <PaginationItem key={i}>
              <PaginationLink
                isActive={currentPage === i + 1}
                onClick={() => setCurrentPage(i + 1)}
              >
                {i + 1}
              </PaginationLink>
            </PaginationItem>
          ))}
          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              isActive={currentPage < totalPages}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  },
};

export const WithFirstAndLast = {
  render: () => {
    const [currentPage, setCurrentPage] = useState(5);
    const totalPages = 10;
    
    return (
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationFirst onClick={() => setCurrentPage(1)} />
          </PaginationItem>
          <PaginationItem>
            <PaginationPrevious
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              isActive={currentPage > 1}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLink isActive={currentPage === 5} onClick={() => setCurrentPage(5)}>
              5
            </PaginationLink>
          </PaginationItem>
          <PaginationItem>
            <PaginationNext
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              isActive={currentPage < totalPages}
            />
          </PaginationItem>
          <PaginationItem>
            <PaginationLast onClick={() => setCurrentPage(totalPages)} />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    );
  },
};

export const WithEllipsis = {
  render: () => (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink isActive>1</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationLink>2</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationEllipsis />
        </PaginationItem>
        <PaginationItem>
          <PaginationLink>10</PaginationLink>
        </PaginationItem>
        <PaginationItem>
          <PaginationNext />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  ),
};
